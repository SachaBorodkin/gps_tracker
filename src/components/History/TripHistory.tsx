import React, { useState, useRef } from 'react';
import { Trip, GPSPoint, TransportMode } from '../../types';
import { GPXService } from '../../services/gpxExporter';
import { getTripPointsOffline } from '../../lib/db';
import { 
  History, 
  Download, 
  Trash2, 
  MapPin, 
  Clock, 
  Activity, 
  Upload, 
  X, 
  Footprints, 
  Flame, 
  Bike, 
  Car, 
  FileCode
} from 'lucide-react';

interface TripHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  onSelectTrip: (trip: Trip, points: GPSPoint[]) => void;
  onDeleteTrip: (tripId: string) => void;
  onImportTrip: (title: string, points: GPSPoint[]) => void;
}

export const TripHistory: React.FC<TripHistoryProps> = ({
  isOpen,
  onClose,
  trips,
  onSelectTrip,
  onDeleteTrip,
  onImportTrip,
}) => {
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredTrips = trips.filter((t) => {
    if (selectedModeFilter === 'all') return true;
    return t.transportMode === selectedModeFilter;
  });

  const formatDistance = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const handleExportGPX = async (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation();
    const points = await getTripPointsOffline(trip.id);
    if (points.length === 0) {
      alert('No GPS points found for this trip.');
      return;
    }
    const gpxData = GPXService.exportToGPX(trip, points);
    const filename = `${trip.title.replace(/\s+/g, '_').toLowerCase()}_${new Date(trip.startTime).toISOString().slice(0, 10)}.gpx`;
    GPXService.downloadFile(gpxData, filename, 'application/gpx+xml');
  };

  const handleExportGeoJSON = async (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation();
    const points = await getTripPointsOffline(trip.id);
    if (points.length === 0) {
      alert('No GPS points found for this trip.');
      return;
    }
    const geoJsonData = GPXService.exportToGeoJSON(trip, points);
    const filename = `${trip.title.replace(/\s+/g, '_').toLowerCase()}_${new Date(trip.startTime).toISOString().slice(0, 10)}.geojson`;
    GPXService.downloadFile(geoJsonData, filename, 'application/geo+json');
  };

  const handleSelectTrip = async (trip: Trip) => {
    const points = await getTripPointsOffline(trip.id);
    onSelectTrip(trip, points);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        try {
          const { title, points } = GPXService.parseGPX(content);
          if (points.length > 0) {
            onImportTrip(title || file.name.replace('.gpx', ''), points);
          } else {
            alert('No valid GPS trackpoints found in GPX file.');
          }
        } catch (err) {
          alert('Failed to parse GPX file. Ensure it is a valid GPX format.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getModeIcon = (mode: TransportMode) => {
    switch (mode) {
      case 'walking': return <Footprints className="w-4 h-4 text-emerald-400" />;
      case 'running': return <Flame className="w-4 h-4 text-amber-400" />;
      case 'cycling': return <Bike className="w-4 h-4 text-cyan-400" />;
      case 'driving': return <Car className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-cyber-card border border-cyber-border rounded-3xl p-6 max-w-xl w-full shadow-2xl flex flex-col gap-4 animate-fadeIn max-h-[85vh] relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between pr-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Route History</h2>
              <p className="text-xs text-slate-400">{trips.length} journeys explored</p>
            </div>
          </div>

          {/* GPX Import Button */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".gpx,.xml"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2 px-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Import standard GPX track file"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import GPX</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
          {['all', 'walking', 'running', 'cycling', 'driving'].map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedModeFilter(mode)}
              className={`py-1.5 px-3 rounded-xl capitalize font-medium transition-all ${
                selectedModeFilter === mode
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Trips List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 max-h-[50vh]">
          {filteredTrips.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
              <MapPin className="w-8 h-8 opacity-40" />
              <span>No recorded routes found yet.</span>
              <span className="text-xs">Start recording to unveil the map!</span>
            </div>
          ) : (
            filteredTrips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => handleSelectTrip(trip)}
                className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {getModeIcon(trip.transportMode)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {trip.title}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                      <span>{new Date(trip.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        {formatDistance(trip.distanceMeters)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        {formatDuration(trip.durationSeconds)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleExportGPX(trip, e)}
                    className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Export GPX"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleExportGeoJSON(trip, e)}
                    className="p-2 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Export GeoJSON"
                  >
                    <FileCode className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete route "${trip.title}"?`)) {
                        onDeleteTrip(trip.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Delete Route"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

