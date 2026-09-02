import React, { useState } from 'react';
import { TrackerStats } from '../../services/gpsTracker';
import { TransportMode } from '../../types';
import { 
  Play, 
  Pause, 
  Square, 
  Footprints, 
  Flame, 
  Bike, 
  Car, 
  Navigation, 
  Activity, 
  Clock, 
  Signal, 
  ShieldCheck 
} from 'lucide-react';

interface TrackingHUDProps {
  stats: TrackerStats;
  onStart: (mode: TransportMode) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: (tripTitle: string) => void;
  onModeChange: (mode: TransportMode) => void;
}

export const TrackingHUD: React.FC<TrackingHUDProps> = ({
  stats,
  onStart,
  onPause,
  onResume,
  onStop,
  onModeChange,
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [tripTitle, setTripTitle] = useState('');

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const handleStopClick = () => {
    const defaultTitle = `${stats.transportMode.charAt(0).toUpperCase() + stats.transportMode.slice(1)} Route - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    setTripTitle(defaultTitle);
    setShowSaveDialog(true);
  };

  const handleConfirmSave = () => {
    onStop(tripTitle || 'Exploration Route');
    setShowSaveDialog(false);
  };

  const transportModes: { mode: TransportMode; label: string; icon: any }[] = [
    { mode: 'walking', label: 'Walk', icon: Footprints },
    { mode: 'running', label: 'Run', icon: Flame },
    { mode: 'cycling', label: 'Bike', icon: Bike },
    { mode: 'driving', label: 'Drive', icon: Car },
  ];

  return (
    <>
      <div className="absolute bottom-4 left-4 right-4 z-20 max-w-xl mx-auto flex flex-col gap-3">
        {/* Live Metrics Dashboard */}
        <div className="bg-cyber-card/90 backdrop-blur-xl border border-cyber-border rounded-3xl p-4 shadow-2xl transition-all duration-300">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-cyber-border/60 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${stats.isRecording ? (stats.isPaused ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-cyan-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${stats.isRecording ? (stats.isPaused ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-cyan-500'}`}></span>
              </span>
              <span className="font-medium text-slate-300">
                {stats.isRecording
                  ? stats.isPaused
                    ? 'TRACKING PAUSED'
                    : 'RECORDING ROUTE'
                  : 'GPS ACTIVE (STANDBY)'}
              </span>
            </div>

            {/* GPS Accuracy Badge */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60">
              <Signal className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {stats.accuracyMeters !== null
                  ? `±${Math.round(stats.accuracyMeters)}m`
                  : 'Acquiring GPS...'}
              </span>
            </div>
          </div>

          {/* Core Numbers Display */}
          <div className="grid grid-cols-3 gap-3 py-3 text-center">
            {/* Speed */}
            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                <Navigation className="w-3 h-3 text-cyan-400" />
                <span>SPEED</span>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-cyan-300">
                {stats.currentSpeedKmh.toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-400">km/h</div>
            </div>

            {/* Distance */}
            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span>DISTANCE</span>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-emerald-300">
                {formatDistance(stats.distanceMeters)}
              </div>
              <div className="text-[10px] text-slate-400">
                Avg: {stats.avgSpeedKmh.toFixed(1)} km/h
              </div>
            </div>

            {/* Duration */}
            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>DURATION</span>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-indigo-300">
                {formatDuration(stats.durationSeconds)}
              </div>
              <div className="text-[10px] text-slate-400">
                {stats.pointsCount} points
              </div>
            </div>
          </div>

          {/* Transport Mode Selector (when not recording) */}
          {!stats.isRecording && (
            <div className="flex gap-2 pt-2 border-t border-cyber-border/60">
              {transportModes.map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => onModeChange(mode)}
                  className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    stats.transportMode === mode
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/30 text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="pt-3">
            {!stats.isRecording ? (
              <button
                onClick={() => onStart(stats.transportMode)}
                className="w-full py-3.5 px-6 rounded-2xl font-semibold text-base flex items-center justify-center gap-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/30 transition-all active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>START RECORDING ROUTE</span>
              </button>
            ) : (
              <div className="flex gap-3">
                {stats.isPaused ? (
                  <button
                    onClick={onResume}
                    className="flex-1 py-3.5 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>RESUME</span>
                  </button>
                ) : (
                  <button
                    onClick={onPause}
                    className="flex-1 py-3.5 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-amber-300 transition-all active:scale-[0.98]"
                  >
                    <Pause className="w-4 h-4" />
                    <span>PAUSE</span>
                  </button>
                )}

                <button
                  onClick={handleStopClick}
                  className="flex-1 py-3.5 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/25 transition-all active:scale-[0.98]"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>STOP & SAVE</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Trip Modal Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-cyber-card border border-cyber-border rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-fadeIn">
            <div className="flex items-center gap-3 text-cyan-400">
              <ShieldCheck className="w-7 h-7" />
              <div>
                <h3 className="text-lg font-bold text-white">Save Explored Route</h3>
                <p className="text-xs text-slate-400">Your journey will be stored locally and synced to cloud</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Route Title</label>
              <input
                type="text"
                value={tripTitle}
                onChange={(e) => setTripTitle(e.target.value)}
                placeholder="Morning Jog in City Center"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800 flex justify-around text-center text-xs">
              <div>
                <div className="text-slate-400">Distance</div>
                <div className="font-mono font-bold text-white text-sm">{formatDistance(stats.distanceMeters)}</div>
              </div>
              <div>
                <div className="text-slate-400">Time</div>
                <div className="font-mono font-bold text-white text-sm">{formatDuration(stats.durationSeconds)}</div>
              </div>
              <div>
                <div className="text-slate-400">Avg Speed</div>
                <div className="font-mono font-bold text-white text-sm">{stats.avgSpeedKmh.toFixed(1)} km/h</div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all"
              >
                Save & Unveil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

