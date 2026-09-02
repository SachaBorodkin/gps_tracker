import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Trip, GPSPoint, ExploredTile } from '../types';

interface FogTrackerDB extends DBSchema {
  trips: {
    key: string;
    value: Trip;
    indexes: { 'by-start': number };
  };
  points: {
    key: string; // tripId_timestamp
    value: GPSPoint & { tripId: string };
    indexes: { 'by-trip': string; 'by-time': number };
  };
  tiles: {
    key: string; // tileKey
    value: ExploredTile;
  };
  sync_queue: {
    key: number;
    value: {
      id?: number;
      action: 'INSERT_TRIP' | 'INSERT_POINTS' | 'DELETE_TRIP';
      data: any;
      createdAt: number;
    };
    autoIncrement: true;
  };
}

const DB_NAME = 'fog_tracker_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FogTrackerDB>> | null = null;

export const getDB = async (): Promise<IDBPDatabase<FogTrackerDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<FogTrackerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Trips store
        if (!db.objectStoreNames.contains('trips')) {
          const tripStore = db.createObjectStore('trips', { keyPath: 'id' });
          tripStore.createIndex('by-start', 'startTime');
        }

        // Points store
        if (!db.objectStoreNames.contains('points')) {
          const pointStore = db.createObjectStore('points', { keyPath: 'id' });
          pointStore.createIndex('by-trip', 'tripId');
          pointStore.createIndex('by-time', 'timestamp');
        }

        // Explored tiles store
        if (!db.objectStoreNames.contains('tiles')) {
          db.createObjectStore('tiles', { keyPath: 'tileKey' });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
};

// ==========================================
// Trip Operations
// ==========================================
export const saveTripOffline = async (trip: Trip, points?: GPSPoint[]): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(['trips', 'points', 'sync_queue'], 'readwrite');
  
  await tx.objectStore('trips').put(trip);

  if (points && points.length > 0) {
    const pointStore = tx.objectStore('points');
    for (const pt of points) {
      const pointId = pt.id || `${trip.id}_${pt.timestamp}`;
      await pointStore.put({ ...pt, id: pointId, tripId: trip.id });
    }
  }

  // Add to sync queue
  await tx.objectStore('sync_queue').add({
    action: 'INSERT_TRIP',
    data: { trip, points },
    createdAt: Date.now(),
  });

  await tx.done;
};

export const getAllTripsOffline = async (): Promise<Trip[]> => {
  const db = await getDB();
  const trips = await db.getAllFromIndex('trips', 'by-start');
  return trips.reverse(); // most recent first
};

export const getTripPointsOffline = async (tripId: string): Promise<GPSPoint[]> => {
  const db = await getDB();
  const points = await db.getAllFromIndex('points', 'by-trip', tripId);
  return points.sort((a, b) => a.timestamp - b.timestamp);
};

export const deleteTripOffline = async (tripId: string): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(['trips', 'points', 'sync_queue'], 'readwrite');
  
  await tx.objectStore('trips').delete(tripId);

  // Delete associated points
  const pointStore = tx.objectStore('points');
  const points = await pointStore.index('by-trip').getAllKeys(tripId);
  for (const key of points) {
    await pointStore.delete(key);
  }

  await tx.objectStore('sync_queue').add({
    action: 'DELETE_TRIP',
    data: { tripId },
    createdAt: Date.now(),
  });

  await tx.done;
};

// ==========================================
// Explored Tiles Operations
// ==========================================
export const saveExploredTilesOffline = async (tiles: ExploredTile[]): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction('tiles', 'readwrite');
  const store = tx.objectStore('tiles');

  for (const t of tiles) {
    const existing = await store.get(t.tileKey);
    if (existing) {
      await store.put({
        tileKey: t.tileKey,
        count: existing.count + (t.count || 1),
        lastVisited: Math.max(existing.lastVisited, t.lastVisited),
      });
    } else {
      await store.put(t);
    }
  }

  await tx.done;
};

export const getAllExploredTilesOffline = async (): Promise<ExploredTile[]> => {
  const db = await getDB();
  return db.getAll('tiles');
};

export const clearAllOfflineData = async (): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(['trips', 'points', 'tiles', 'sync_queue'], 'readwrite');
  await tx.objectStore('trips').clear();
  await tx.objectStore('points').clear();
  await tx.objectStore('tiles').clear();
  await tx.objectStore('sync_queue').clear();
  await tx.done;
};

