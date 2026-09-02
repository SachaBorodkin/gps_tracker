import React from 'react';
import { FogStats } from '../../services/fogEngine';
import { Trip } from '../../types';
import { 
  Trophy, 
  Compass, 
  Map, 
  Footprints, 
  Bike, 
  Car, 
  Flame, 
  Sparkles, 
  Award,
  X 
} from 'lucide-react';

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  fogStats: FogStats;
  trips: Trip[];
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  isOpen,
  onClose,
  fogStats,
  trips,
}) => {
  if (!isOpen) return null;

  // Calculate totals
  const totalDistanceMeters = trips.reduce((acc, t) => acc + t.distanceMeters, 0);

  // Mode breakdown
  const walkingDist = trips.filter((t) => t.transportMode === 'walking').reduce((acc, t) => acc + t.distanceMeters, 0);
  const runningDist = trips.filter((t) => t.transportMode === 'running').reduce((acc, t) => acc + t.distanceMeters, 0);
  const cyclingDist = trips.filter((t) => t.transportMode === 'cycling').reduce((acc, t) => acc + t.distanceMeters, 0);
  const drivingDist = trips.filter((t) => t.transportMode === 'driving').reduce((acc, t) => acc + t.distanceMeters, 0);

  const formatDistance = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
  };

  const xpPercent = Math.min(100, Math.round((fogStats.currentLevelXp / fogStats.nextLevelXp) * 100)) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-cyber-card border border-cyber-border rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 animate-fadeIn max-h-[90vh] overflow-y-auto relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Exploration Stats</h2>
            <p className="text-xs text-slate-400">Your real-world discovered territory</p>
          </div>
        </div>

        {/* Level Banner Card */}
        <div className="bg-gradient-to-r from-cyan-950/50 via-slate-900 to-indigo-950/50 border border-cyan-500/30 rounded-3xl p-4 flex flex-col gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-cyan-500/20">
                {fogStats.explorationLevel}
              </div>
              <div>
                <div className="text-xs font-semibold text-cyan-400 tracking-wider uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Level {fogStats.explorationLevel} Explorer</span>
                </div>
                <div className="text-base font-bold text-white">{fogStats.levelTitle}</div>
              </div>
            </div>

            <Award className="w-8 h-8 text-amber-400 opacity-80" />
          </div>

          {/* XP Progress Bar */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>EXP: {fogStats.currentLevelXp} XP</span>
              <span>{xpPercent}% to Level {fogStats.explorationLevel + 1}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
              <div
                className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-cyan-400"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Major Metric Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Explored Territory */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Unveiled Territory</span>
            </div>
            <div className="text-xl font-bold font-mono text-cyan-300">
              {fogStats.exploredAreaKm2} <span className="text-xs font-sans text-slate-400">km²</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {fogStats.totalPointsExplored} discrete zone tiles
            </div>
          </div>

          {/* Total Distance */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Map className="w-4 h-4 text-emerald-400" />
              <span>Total Traversed</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-300">
              {formatDistance(totalDistanceMeters)}
            </div>
            <div className="text-[10px] text-slate-500">
              {trips.length} completed trips
            </div>
          </div>
        </div>

        {/* Transport Breakdown */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Activity Breakdown
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-300">
                <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                <span>Walking</span>
              </div>
              <span className="font-mono font-semibold text-white">{formatDistance(walkingDist)}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-300">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Running</span>
              </div>
              <span className="font-mono font-semibold text-white">{formatDistance(runningDist)}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-300">
                <Bike className="w-3.5 h-3.5 text-cyan-400" />
                <span>Cycling</span>
              </div>
              <span className="font-mono font-semibold text-white">{formatDistance(cyclingDist)}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-300">
                <Car className="w-3.5 h-3.5 text-indigo-400" />
                <span>Driving</span>
              </div>
              <span className="font-mono font-semibold text-white">{formatDistance(drivingDist)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

