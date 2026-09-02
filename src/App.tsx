import React, { useState, useEffect, useCallback } from 'react';
import { GPSPoint, Trip, UserProfile, UserSettings, TransportMode } from './types';
import { gpsTracker, TrackerStats } from './services/gpsTracker';
import { FogEngine, FogStats } from './services/fogEngine';
import { 
  getAllTripsOffline, 
  saveTripOffline, 
  deleteTripOffline, 
  getTripPointsOffline, 
  getAllExploredTilesOffline, 
  saveExploredTilesOffline 
} from './lib/db';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase';
import { subscribeToSyncStatus, triggerSync, SyncStatus } from './lib/sync';

// Components
import { ExplorerMap } from './components/Map/ExplorerMap';
import { TrackingHUD } from './components/Controls/TrackingHUD';
import { AuthModal } from './components/Auth/AuthModal';
import { TripHistory } from './components/History/TripHistory';
import { StatsPanel } from './components/Analytics/StatsPanel';
import { SettingsModal } from './components/Settings/SettingsModal';
import { SimulateRoute } from './components/Simulation/SimulateRoute';

// Icons
import { 
  Compass, 
  Trophy, 
  History, 
  Settings as SettingsIcon, 
  User, 
  RefreshCw, 
  Radio
} from 'lucide-react';

const DEFAULT_SETTINGS: UserSettings = {
  fogRadiusMeters: 35,
  fogOpacity: 0.8,
  fogColor: '#0a0e17',
  pathColor: '#00f2fe',
  highAccuracyGPS: true,
  minDistanceFilterMeters: 3,
  theme: 'dark',
  defaultMapLayer: 'carto-dark',
  units: 'metric',
  autoCenterMap: true,
};

export const App: React.FC = () => {
  // App State
  const [currentPosition, setCurrentPosition] = useState<GPSPoint | null>(null);
  const [trackerStats, setTrackerStats] = useState<TrackerStats>(gpsTracker.getStats());
  const [livePoints, setLivePoints] = useState<GPSPoint[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [allTripsPoints, setAllTripsPoints] = useState<GPSPoint[][]>([]);
  const [selectedTripPoints, setSelectedTripPoints] = useState<GPSPoint[] | null>(null);
  const [fogStats, setFogStats] = useState<FogStats>({
    exploredAreaSqm: 0,
    exploredAreaKm2: 0,
    totalPointsExplored: 0,
    explorationLevel: 1,
    currentLevelXp: 0,
    nextLevelXp: 100,
    levelTitle: 'Wanderer',
  });

  // Settings & Auth State
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('fog_user_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    errorMessage: null,
  });

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  // Load Initial Trips and Explored Tiles from IndexedDB
  const refreshLocalData = useCallback(async () => {
    try {
      const loadedTrips = await getAllTripsOffline();
      setTrips(loadedTrips);

      // Load points for all trips
      const pointsList: GPSPoint[][] = [];
      for (const t of loadedTrips) {
        const pts = await getTripPointsOffline(t.id);
        if (pts.length > 0) {
          pointsList.push(pts);
        }
      }
      setAllTripsPoints(pointsList);

      // Load explored tiles
      const tiles = await getAllExploredTilesOffline();

      // Calculate total distance
      const totalDist = loadedTrips.reduce((acc, t) => acc + t.distanceMeters, 0);
      const computedStats = FogEngine.calculateFogStats(tiles.length, totalDist);
      setFogStats(computedStats);
    } catch (e) {
      console.error('Failed to load offline data:', e);
    }
  }, []);

  // Initialize Auth & Supabase
  useEffect(() => {
    refreshLocalData();

    // Check existing Supabase session
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setProfile({
              id: session.user.id,
              email: session.user.email || '',
              displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'Explorer',
              totalDistanceMeters: 0,
              totalDurationSeconds: 0,
              totalTripsCount: 0,
              exploredAreaSqm: 0,
              explorationLevel: 1,
              settings,
            });
            triggerSync().then(() => refreshLocalData());
          }
        });
      }
    }

    // Subscribe to Sync Status
    const unsubscribeSync = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribeSync();
    };
  }, [refreshLocalData]);

  // Subscribe to GPS Tracker
  useEffect(() => {
    const unsubscribe = gpsTracker.subscribe((point, stats) => {
      setCurrentPosition(point);
      setTrackerStats(stats);
      if (stats.isRecording) {
        setLivePoints(gpsTracker.getCurrentPoints());
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Start Recording
  const handleStartTrip = (mode: TransportMode) => {
    setSelectedTripPoints(null);
    gpsTracker.startRecording(mode);
    setLivePoints(gpsTracker.getCurrentPoints());
  };

  // Pause Recording
  const handlePauseTrip = () => {
    gpsTracker.pauseRecording();
  };

  // Resume Recording
  const handleResumeTrip = () => {
    gpsTracker.resumeRecording();
  };

  // Stop Recording & Save Trip
  const handleStopTrip = async (title: string) => {
    const { points, stats } = gpsTracker.stopRecording();
    setLivePoints([]);

    if (points.length < 2 && stats.distanceMeters < 10) {
      alert('Trip was too short to record.');
      return;
    }

    const tripId = crypto.randomUUID ? crypto.randomUUID() : `trip_${Date.now()}`;
    const newTrip: Trip = {
      id: tripId,
      userId: profile?.id,
      title: title || 'Exploration Route',
      transportMode: stats.transportMode,
      startTime: points[0]?.timestamp || Date.now(),
      endTime: Date.now(),
      distanceMeters: stats.distanceMeters,
      durationSeconds: stats.durationSeconds,
      avgSpeedKmh: stats.avgSpeedKmh,
      maxSpeedKmh: stats.maxSpeedKmh,
      pointsCount: points.length,
      points,
      isSynced: false,
    };

    // Extract newly explored tiles
    const newTiles = FogEngine.extractExploredTiles(points);
    await saveExploredTilesOffline(newTiles);
    await saveTripOffline(newTrip, points);

    // Refresh memory
    await refreshLocalData();

    // Trigger Cloud Sync if Supabase is connected
    if (isSupabaseConfigured() && profile) {
      triggerSync();
    }
  };

  // Delete Trip
  const handleDeleteTrip = async (tripId: string) => {
    await deleteTripOffline(tripId);
    if (selectedTripPoints) setSelectedTripPoints(null);
    await refreshLocalData();
    if (isSupabaseConfigured() && profile) {
      triggerSync();
    }
  };

  // Import GPX Route
  const handleImportTrip = async (title: string, points: GPSPoint[]) => {
    if (points.length < 2) return;

    let totalDist = 0;
    for (let i = 1; i < points.length; i++) {
      totalDist += FogEngine.latLngToTileKey(points[i].latitude, points[i].longitude) !== FogEngine.latLngToTileKey(points[i-1].latitude, points[i-1].longitude) ? 40 : 10;
    }

    const tripId = `imported_${Date.now()}`;
    const startTime = points[0].timestamp;
    const endTime = points[points.length - 1].timestamp;
    const durationSeconds = Math.max(60, Math.floor((endTime - startTime) / 1000));

    const newTrip: Trip = {
      id: tripId,
      userId: profile?.id,
      title: title || 'Imported GPX Route',
      transportMode: 'walking',
      startTime,
      endTime,
      distanceMeters: totalDist,
      durationSeconds,
      avgSpeedKmh: (totalDist / durationSeconds) * 3.6,
      maxSpeedKmh: 15,
      pointsCount: points.length,
      points,
      isSynced: false,
    };

    const newTiles = FogEngine.extractExploredTiles(points);
    await saveExploredTilesOffline(newTiles);
    await saveTripOffline(newTrip, points);
    await refreshLocalData();

    if (isSupabaseConfigured() && profile) {
      triggerSync();
    }
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('fog_user_settings', JSON.stringify(newSettings));
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col bg-cyber-dark text-slate-100 select-none">
      {/* Top Header Bar */}
      <header className="absolute top-0 left-0 right-0 z-30 px-4 py-3 flex items-center justify-between pointer-events-none">
        {/* Logo & Title */}
        <div className="flex items-center gap-2.5 bg-cyber-card/85 backdrop-blur-xl border border-cyber-border/70 rounded-2xl px-3.5 py-2 shadow-xl pointer-events-auto">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/30">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-cyan-300">
              FOG TRACKER
            </h1>
            <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
              <span>{fogStats.exploredAreaKm2} km²</span>
              <span className="text-slate-500">•</span>
              <span>Lvl {fogStats.explorationLevel}</span>
            </div>
          </div>
        </div>

        {/* Action Icons Pill */}
        <div className="flex items-center gap-1.5 bg-cyber-card/85 backdrop-blur-xl border border-cyber-border/70 rounded-2xl p-1.5 shadow-xl pointer-events-auto">
          {/* Cloud Sync Status Indicator */}
          <button
            onClick={() => {
              if (isSupabaseConfigured()) {
                triggerSync().then(() => refreshLocalData());
              } else {
                setIsAuthModalOpen(true);
              }
            }}
            className={`p-2 rounded-xl transition-all ${
              syncStatus.isSyncing
                ? 'text-cyan-400 bg-cyan-500/10'
                : isSupabaseConfigured() && profile
                ? 'text-emerald-400 hover:bg-slate-800'
                : 'text-amber-400/80 hover:bg-slate-800'
            }`}
            title={
              syncStatus.isSyncing
                ? 'Syncing to Supabase...'
                : isSupabaseConfigured() && profile
                ? 'Supabase Cloud Synced (Click to refresh)'
                : 'Offline Mode (Click to setup Supabase)'
            }
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* GPS Simulation Test Tool */}
          <button
            onClick={() => setIsSimulateModalOpen(true)}
            className="p-2 text-cyan-400 hover:bg-slate-800 rounded-xl transition-colors"
            title="Simulate GPS Route Movement"
          >
            <Radio className="w-4 h-4" />
          </button>

          {/* Exploration Stats / Trophy */}
          <button
            onClick={() => setIsStatsModalOpen(true)}
            className="p-2 text-amber-400 hover:bg-slate-800 rounded-xl transition-colors"
            title="Exploration Analytics"
          >
            <Trophy className="w-4 h-4" />
          </button>

          {/* History */}
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Route History & GPX"
          >
            <History className="w-4 h-4" />
          </button>

          {/* User Profile / Supabase Auth */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Account & Cloud Sync"
          >
            <User className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Settings & Map Styles"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Map Viewport */}
      <main className="flex-1 w-full h-full relative">
        <ExplorerMap
          currentPosition={currentPosition}
          liveTrackPoints={livePoints}
          allTripsPoints={allTripsPoints}
          settings={settings}
          selectedTripPoints={selectedTripPoints}
        />
      </main>

      {/* Live Tracking Controls Bottom HUD */}
      <TrackingHUD
        stats={trackerStats}
        onStart={handleStartTrip}
        onPause={handlePauseTrip}
        onResume={handleResumeTrip}
        onStop={handleStopTrip}
        onModeChange={(mode) => gpsTracker.setTransportMode(mode)}
      />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        profile={profile}
        onAuthChange={(newProfile) => {
          setProfile(newProfile);
          if (newProfile) {
            triggerSync().then(() => refreshLocalData());
          }
        }}
      />

      <TripHistory
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        trips={trips}
        onSelectTrip={(_trip, points) => setSelectedTripPoints(points)}
        onDeleteTrip={handleDeleteTrip}
        onImportTrip={handleImportTrip}
      />

      <StatsPanel
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        fogStats={fogStats}
        trips={trips}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetData={refreshLocalData}
      />

      <SimulateRoute
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        currentLat={currentPosition?.latitude}
        currentLng={currentPosition?.longitude}
      />
    </div>
  );
};

export default App;

