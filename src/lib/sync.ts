import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { getDB, getAllTripsOffline, saveTripOffline } from './db';
import { Trip, GPSPoint } from '../types';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingCount: number;
  errorMessage: string | null;
}

let syncListeners: ((status: SyncStatus) => void)[] = [];

let currentStatus: SyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSyncedAt: null,
  pendingCount: 0,
  errorMessage: null,
};

const notifyListeners = () => {
  syncListeners.forEach((fn) => fn({ ...currentStatus }));
};

export const subscribeToSyncStatus = (fn: (status: SyncStatus) => void) => {
  syncListeners.push(fn);
  fn({ ...currentStatus });
  return () => {
    syncListeners = syncListeners.filter((l) => l !== fn);
  };
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    currentStatus.isOnline = true;
    notifyListeners();
    triggerSync();
  });

  window.addEventListener('offline', () => {
    currentStatus.isOnline = false;
    notifyListeners();
  });
}

export const triggerSync = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = getSupabaseClient();
  if (!supabase || !navigator.onLine) {
    return false;
  }

  if (currentStatus.isSyncing) return false;

  try {
    currentStatus.isSyncing = true;
    currentStatus.errorMessage = null;
    notifyListeners();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      currentStatus.isSyncing = false;
      notifyListeners();
      return false;
    }

    const userId = session.user.id;
    const db = await getDB();

    // 1. Process pending offline sync queue
    const queueItems = await db.getAll('sync_queue');
    currentStatus.pendingCount = queueItems.length;
    notifyListeners();

    for (const item of queueItems) {
      if (item.action === 'INSERT_TRIP') {
        const { trip, points } = item.data;
        
        // Upsert Trip in Supabase
        const { error: tripError } = await supabase.from('trips').upsert({
          id: trip.id,
          user_id: userId,
          title: trip.title,
          transport_mode: trip.transportMode,
          start_time: new Date(trip.startTime).toISOString(),
          end_time: trip.endTime ? new Date(trip.endTime).toISOString() : null,
          distance_meters: trip.distanceMeters,
          duration_seconds: trip.durationSeconds,
          avg_speed_kmh: trip.avgSpeedKmh,
          max_speed_kmh: trip.maxSpeedKmh,
          points_count: trip.pointsCount,
          bounds: trip.bounds ? trip.bounds : null,
          is_synced: true,
        });

        if (tripError) {
          console.error('Failed to sync trip to Supabase:', tripError);
          continue;
        }

        // Insert Track Points in batches
        if (points && points.length > 0) {
          const batchSize = 100;
          for (let i = 0; i < points.length; i += batchSize) {
            const batch = points.slice(i, i + batchSize).map((pt: GPSPoint) => ({
              trip_id: trip.id,
              user_id: userId,
              latitude: pt.latitude,
              longitude: pt.longitude,
              altitude: pt.altitude || null,
              accuracy: pt.accuracy || null,
              speed: pt.speed || null,
              heading: pt.heading || null,
              timestamp: new Date(pt.timestamp).toISOString(),
            }));

            const { error: pointsError } = await supabase.from('track_points').upsert(batch);
            if (pointsError) {
              console.error('Failed to sync track points batch:', pointsError);
            }
          }
        }
      } else if (item.action === 'DELETE_TRIP') {
        const { tripId } = item.data;
        await supabase.from('trips').delete().eq('id', tripId).eq('user_id', userId);
      }

      // Delete processed item from sync queue
      if (item.id !== undefined) {
        await db.delete('sync_queue', item.id);
      }
    }

    // 2. Pull remote trips to update local database if missing
    const { data: remoteTrips, error: pullError } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });

    if (!pullError && remoteTrips) {
      const localTrips = await getAllTripsOffline();
      const localTripIds = new Set(localTrips.map((t) => t.id));

      for (const rTrip of remoteTrips) {
        if (!localTripIds.has(rTrip.id)) {
          // Fetch points for this missing trip
          const { data: rPoints } = await supabase
            .from('track_points')
            .select('*')
            .eq('trip_id', rTrip.id)
            .order('timestamp', { ascending: true });

          const convertedPoints: GPSPoint[] = (rPoints || []).map((pt: any) => ({
            id: pt.id,
            tripId: pt.trip_id,
            latitude: pt.latitude,
            longitude: pt.longitude,
            altitude: pt.altitude,
            accuracy: pt.accuracy,
            speed: pt.speed,
            heading: pt.heading,
            timestamp: new Date(pt.timestamp).getTime(),
          }));

          const convertedTrip: Trip = {
            id: rTrip.id,
            userId: rTrip.user_id,
            title: rTrip.title,
            transportMode: rTrip.transport_mode,
            startTime: new Date(rTrip.start_time).getTime(),
            endTime: rTrip.end_time ? new Date(rTrip.end_time).getTime() : null,
            distanceMeters: rTrip.distance_meters,
            durationSeconds: rTrip.duration_seconds,
            avgSpeedKmh: rTrip.avg_speed_kmh,
            maxSpeedKmh: rTrip.max_speed_kmh,
            pointsCount: rTrip.points_count,
            bounds: rTrip.bounds,
            isSynced: true,
          };

          await saveTripOffline(convertedTrip, convertedPoints);
        }
      }
    }

    currentStatus.lastSyncedAt = Date.now();
    currentStatus.pendingCount = 0;
    currentStatus.isSyncing = false;
    notifyListeners();
    return true;
  } catch (err: any) {
    console.error('Sync failed:', err);
    currentStatus.errorMessage = err.message || 'Sync failed';
    currentStatus.isSyncing = false;
    notifyListeners();
    return false;
  }
};

