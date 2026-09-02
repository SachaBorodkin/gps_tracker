import { GPSPoint, TransportMode } from '../types';

export interface TrackerStats {
  isRecording: boolean;
  isPaused: boolean;
  currentPoint: GPSPoint | null;
  distanceMeters: number;
  durationSeconds: number;
  currentSpeedKmh: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  pointsCount: number;
  transportMode: TransportMode;
  accuracyMeters: number | null;
}

export type GPSUpdateCallback = (point: GPSPoint, stats: TrackerStats) => void;

// Haversine formula to calculate distance between two GPS coordinates in meters
export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

export class GPSTrackerService {
  private watchId: number | null = null;
  private isRecording: boolean = false;
  private isPaused: boolean = false;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private lastPoint: GPSPoint | null = null;
  private points: GPSPoint[] = [];
  private distanceMeters: number = 0;
  private maxSpeedKmh: number = 0;
  private transportMode: TransportMode = 'walking';
  private callbacks: GPSUpdateCallback[] = [];
  private timerInterval: any = null;
  private simulationInterval: any = null;
  private isSimulating: boolean = false;

  // Accuracy and filtering settings
  public maxAccuracyThreshold: number = 30; // ignore points with accuracy > 30m
  public minDistanceThreshold: number = 3; // min meters between logged points

  constructor() {
    this.startLiveLocationStream();
  }

  public subscribe(callback: GPSUpdateCallback): () => void {
    this.callbacks.push(callback);
    // Send initial state immediately
    callback(this.lastPoint || { latitude: 48.8566, longitude: 2.3522, timestamp: Date.now() }, this.getStats());
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  private notify(point: GPSPoint) {
    const stats = this.getStats();
    for (const cb of this.callbacks) {
      cb(point, stats);
    }
  }

  public getStats(): TrackerStats {
    const duration = this.isRecording
      ? Math.max(0, Math.floor((Date.now() - this.startTime - this.pausedTime) / 1000))
      : 0;
    
    const avgSpeed = duration > 0 ? (this.distanceMeters / duration) * 3.6 : 0;
    const currentSpeed = this.lastPoint?.speed ? Math.max(0, this.lastPoint.speed * 3.6) : 0;

    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      currentPoint: this.lastPoint,
      distanceMeters: this.distanceMeters,
      durationSeconds: duration,
      currentSpeedKmh: currentSpeed,
      avgSpeedKmh: avgSpeed,
      maxSpeedKmh: this.maxSpeedKmh,
      pointsCount: this.points.length,
      transportMode: this.transportMode,
      accuracyMeters: this.lastPoint?.accuracy ?? null,
    };
  }

  public startLiveLocationStream() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (this.isSimulating) return; // Don't override simulation
        this.processNewPosition(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.altitude,
          pos.coords.accuracy,
          pos.coords.speed,
          pos.coords.heading,
          pos.timestamp
        );
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );
  }

  private processNewPosition(
    lat: number,
    lng: number,
    alt: number | null,
    accuracy: number | null,
    speed: number | null,
    heading: number | null,
    timestamp: number
  ) {
    // Jitter filtering
    if (accuracy && accuracy > this.maxAccuracyThreshold && !this.isSimulating) {
      return;
    }

    const newPoint: GPSPoint = {
      latitude: lat,
      longitude: lng,
      altitude: alt,
      accuracy: accuracy,
      speed: speed,
      heading: heading,
      timestamp: timestamp || Date.now(),
    };

    if (this.lastPoint) {
      const dist = calculateHaversineDistance(
        this.lastPoint.latitude,
        this.lastPoint.longitude,
        lat,
        lng
      );

      // Filter out micro-jitter unless distance > min threshold
      if (this.isRecording && !this.isPaused) {
        if (dist >= this.minDistanceThreshold) {
          this.distanceMeters += dist;

          // Compute speed if not provided by device
          const dt = (newPoint.timestamp - this.lastPoint.timestamp) / 1000;
          if ((!newPoint.speed || newPoint.speed <= 0) && dt > 0) {
            newPoint.speed = dist / dt;
          }

          const currentKmh = (newPoint.speed || 0) * 3.6;
          if (currentKmh > this.maxSpeedKmh && currentKmh < 250) {
            this.maxSpeedKmh = currentKmh;
          }

          this.points.push(newPoint);
        }
      }
    } else if (this.isRecording && !this.isPaused) {
      this.points.push(newPoint);
    }

    this.lastPoint = newPoint;
    this.notify(newPoint);
  }

  public startRecording(mode: TransportMode = 'walking') {
    this.isRecording = true;
    this.isPaused = false;
    this.transportMode = mode;
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.distanceMeters = 0;
    this.maxSpeedKmh = 0;
    this.points = [];

    if (this.lastPoint) {
      this.points.push(this.lastPoint);
    }

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.lastPoint) {
        this.notify(this.lastPoint);
      }
    }, 1000);
  }

  public pauseRecording() {
    this.isPaused = true;
    if (this.lastPoint) this.notify(this.lastPoint);
  }

  public resumeRecording() {
    this.isPaused = false;
    if (this.lastPoint) this.notify(this.lastPoint);
  }

  public stopRecording(): { points: GPSPoint[]; stats: TrackerStats } {
    const finalPoints = [...this.points];
    const finalStats = this.getStats();

    this.isRecording = false;
    this.isPaused = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;

    if (this.lastPoint) this.notify(this.lastPoint);

    return { points: finalPoints, stats: finalStats };
  }

  public setTransportMode(mode: TransportMode) {
    this.transportMode = mode;
    if (this.lastPoint) this.notify(this.lastPoint);
  }

  public getCurrentPoints(): GPSPoint[] {
    return [...this.points];
  }

  // ==========================================
  // GPS Simulation for Browser Testing
  // ==========================================
  public startSimulation(startLat: number = 48.8566, startLng: number = 2.3522, mode: TransportMode = 'walking') {
    this.stopSimulation();
    this.isSimulating = true;
    this.transportMode = mode;

    let curLat = startLat;
    let curLng = startLng;
    let angle = Math.random() * Math.PI * 2;

    const speedMps = mode === 'walking' ? 1.4 : mode === 'running' ? 3.2 : mode === 'cycling' ? 6.5 : 14.0;
    const intervalMs = 1000;

    this.simulationInterval = setInterval(() => {
      // Random gentle turn
      angle += (Math.random() - 0.5) * 0.4;
      const metersMoved = speedMps * (intervalMs / 1000);
      
      const deltaLat = (metersMoved * Math.cos(angle)) / 111111;
      const deltaLng = (metersMoved * Math.sin(angle)) / (111111 * Math.cos((curLat * Math.PI) / 180));

      curLat += deltaLat;
      curLng += deltaLng;

      this.processNewPosition(
        curLat,
        curLng,
        35 + Math.sin(Date.now() / 10000) * 10,
        4.5,
        speedMps,
        (angle * 180) / Math.PI,
        Date.now()
      );
    }, intervalMs);
  }

  public stopSimulation() {
    this.isSimulating = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  public isSimulatingActive(): boolean {
    return this.isSimulating;
  }
}

export const gpsTracker = new GPSTrackerService();

