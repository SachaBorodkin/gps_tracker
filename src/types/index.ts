export type TransportMode = 'walking' | 'running' | 'cycling' | 'driving';

export interface GPSPoint {
  id?: string;
  tripId?: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null; // in m/s
  heading?: number | null;
  timestamp: number; // epoch ms
}

export interface Trip {
  id: string;
  userId?: string;
  title: string;
  transportMode: TransportMode;
  startTime: number;
  endTime?: number | null;
  distanceMeters: number;
  durationSeconds: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  pointsCount: number;
  bounds?: [number, number, number, number]; // [minLat, minLng, maxLat, maxLng]
  points?: GPSPoint[];
  isSynced?: boolean;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalTripsCount: number;
  exploredAreaSqm: number;
  explorationLevel: number;
  settings: UserSettings;
}

export interface UserSettings {
  fogRadiusMeters: number; // default 35m
  fogOpacity: number; // 0.1 to 0.95
  fogColor: string; // e.g. '#070b14'
  pathColor: string; // e.g. '#00f2fe'
  highAccuracyGPS: boolean;
  minDistanceFilterMeters: number; // default 3m
  theme: 'dark' | 'light';
  defaultMapLayer: 'carto-dark' | 'carto-voyager' | 'osm' | 'opentopo';
  units: 'metric' | 'imperial';
  autoCenterMap: boolean;
}

export interface MapLayerOption {
  id: 'carto-dark' | 'carto-voyager' | 'osm' | 'opentopo';
  name: string;
  url: string;
  attribution: string;
  subdomains?: string[];
  maxZoom: number;
  isDark: boolean;
}

export interface ExploredTile {
  tileKey: string;
  count: number;
  lastVisited: number;
}

