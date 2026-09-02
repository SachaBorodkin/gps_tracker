import React, { useState } from 'react';
import { gpsTracker } from '../../services/gpsTracker';
import { TransportMode } from '../../types';
import { Play, Square, MapPin, Sparkles, X } from 'lucide-react';

interface SimulateRouteProps {
  isOpen: boolean;
  onClose: () => void;
  currentLat?: number;
  currentLng?: number;
}

const PRESET_CITIES = [
  { name: 'Current View / Map Center', lat: null, lng: null },
  { name: 'Paris (Eiffel Tower & Seine)', lat: 48.8584, lng: 2.2945 },
  { name: 'New York (Central Park)', lat: 40.785091, lng: -73.968285 },
  { name: 'Tokyo (Shinjuku)', lat: 35.6895, lng: 139.6917 },
  { name: 'London (Hyde Park)', lat: 51.5072, lng: -0.1657 },
];

export const SimulateRoute: React.FC<SimulateRouteProps> = ({
  isOpen,
  onClose,
  currentLat = 48.8566,
  currentLng = 2.3522,
}) => {
  const [selectedCityIdx, setSelectedCityIdx] = useState<number>(0);
  const [simMode, setSimMode] = useState<TransportMode>('walking');
  const [isSimActive, setIsSimActive] = useState<boolean>(gpsTracker.isSimulatingActive());

  if (!isOpen) return null;

  const handleStartSimulation = () => {
    const city = PRESET_CITIES[selectedCityIdx];
    const targetLat = city.lat ?? currentLat;
    const targetLng = city.lng ?? currentLng;

    gpsTracker.startSimulation(targetLat, targetLng, simMode);
    setIsSimActive(true);
    onClose();
  };

  const handleStopSimulation = () => {
    gpsTracker.stopSimulation();
    setIsSimActive(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-cyber-card border border-cyber-border rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-fadeIn relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">GPS Route Simulator</h2>
            <p className="text-xs text-slate-400">Test live tracking without walking outside</p>
          </div>
        </div>

        {/* Preset Location Picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simulation Starting Area</span>
          </label>
          <div className="flex flex-col gap-1.5 bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
            {PRESET_CITIES.map((city, idx) => (
              <button
                key={city.name}
                onClick={() => setSelectedCityIdx(idx)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between ${
                  selectedCityIdx === idx
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>{city.name}</span>
                {selectedCityIdx === idx && <span className="w-2 h-2 rounded-full bg-cyan-400"></span>}
              </button>
            ))}
          </div>
        </div>

        {/* Transport Mode */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300">Simulation Speed & Mode</label>
          <div className="grid grid-cols-4 gap-2">
            {(['walking', 'running', 'cycling', 'driving'] as TransportMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSimMode(mode)}
                className={`py-2 px-1 rounded-xl text-xs capitalize font-medium transition-all ${
                  simMode === mode
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="pt-2 flex gap-3">
          {isSimActive ? (
            <button
              onClick={handleStopSimulation}
              className="w-full py-3 px-4 rounded-xl bg-rose-500/20 border border-rose-500/50 hover:bg-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Active Simulation</span>
            </button>
          ) : (
            <button
              onClick={handleStartSimulation}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch GPS Simulation</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

