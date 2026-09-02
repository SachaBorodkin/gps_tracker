import React from 'react';
import { UserSettings } from '../../types';
import { clearAllOfflineData } from '../../lib/db';
import { 
  Settings as SettingsIcon, 
  Sliders, 
  Trash2, 
  Palette, 
  Navigation, 
  X 
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetData,
}) => {
  if (!isOpen) return null;

  const handleFogRadiusChange = (radius: number) => {
    onUpdateSettings({ ...settings, fogRadiusMeters: radius });
  };

  const handleFogOpacityChange = (opacity: number) => {
    onUpdateSettings({ ...settings, fogOpacity: opacity });
  };

  const handlePathColorChange = (color: string) => {
    onUpdateSettings({ ...settings, pathColor: color });
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear all offline stored trips and reset your local fog? This cannot be undone.')) {
      await clearAllOfflineData();
      onResetData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-cyber-card border border-cyber-border rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-5 animate-fadeIn relative max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">App Settings</h2>
            <p className="text-xs text-slate-400">Map & Fog Customization</p>
          </div>
        </div>

        {/* Section 1: Fog of War Rendering */}
        <div className="flex flex-col gap-4">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Fog of War Visualization</span>
          </div>

          {/* Reveal Radius */}
          <div className="flex flex-col gap-1.5 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Exploration Reveal Radius</span>
              <span className="font-mono font-bold text-cyan-400">{settings.fogRadiusMeters} meters</span>
            </div>
            <input
              type="range"
              min="15"
              max="120"
              step="5"
              value={settings.fogRadiusMeters}
              onChange={(e) => handleFogRadiusChange(parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">
              Corridor width uncovered around your GPS path.
            </span>
          </div>

          {/* Fog Opacity */}
          <div className="flex flex-col gap-1.5 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Fog Darkness (Opacity)</span>
              <span className="font-mono font-bold text-cyan-400">{Math.round(settings.fogOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="0.95"
              step="0.05"
              value={settings.fogOpacity}
              onChange={(e) => handleFogOpacityChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">
              Higher opacity hides more of the unexplored world.
            </span>
          </div>

          {/* Trail Color Picker */}
          <div className="flex flex-col gap-2 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-xs text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>Traversed Route Trail Color</span>
            </div>
            <div className="flex gap-2">
              {[
                { label: 'Cyan Glow', color: '#00f2fe' },
                { label: 'Emerald Neon', color: '#00ff87' },
                { label: 'Amber Flame', color: '#ffb300' },
                { label: 'Hot Pink', color: '#ff007f' },
                { label: 'Purple Haze', color: '#a855f7' },
              ].map(({ label, color }) => (
                <button
                  key={color}
                  onClick={() => handlePathColorChange(color)}
                  style={{ backgroundColor: color }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    settings.pathColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  title={label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: GPS Configuration */}
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>GPS Tracking Configuration</span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800">
            <div>
              <div className="text-xs font-semibold text-white">High Accuracy Mode</div>
              <div className="text-[10px] text-slate-400">Uses GPS satellites for precise outdoor trails</div>
            </div>
            <input
              type="checkbox"
              checked={settings.highAccuracyGPS}
              onChange={(e) => onUpdateSettings({ ...settings, highAccuracyGPS: e.target.checked })}
              className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Section 3: Data Management */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={handleClearData}
            className="w-full py-3 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Local Data & Reset Fog</span>
          </button>
        </div>
      </div>
    </div>
  );
};

