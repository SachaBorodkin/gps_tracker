import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { GPSPoint, MapLayerOption, UserSettings } from '../../types';
import { FogEngine } from '../../services/fogEngine';
import { Layers, Crosshair, ZoomIn, ZoomOut, Eye, EyeOff } from 'lucide-react';

export const MAP_LAYERS: MapLayerOption[] = [
  {
    id: 'carto-dark',
    name: 'Dark Explorer (CARTO)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
    isDark: true,
  },
  {
    id: 'carto-voyager',
    name: 'Voyager Daylight (CARTO)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
    isDark: false,
  },
  {
    id: 'osm',
    name: 'OpenStreetMap Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    isDark: false,
  },
  {
    id: 'opentopo',
    name: 'Topographic (OpenTopo)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 17,
    isDark: false,
  },
];

interface ExplorerMapProps {
  currentPosition: GPSPoint | null;
  liveTrackPoints: GPSPoint[];
  allTripsPoints: GPSPoint[][];
  settings: UserSettings;
  selectedTripPoints?: GPSPoint[] | null;
  onMapClick?: (lat: number, lng: number) => void;
}

export const ExplorerMap: React.FC<ExplorerMapProps> = ({
  currentPosition,
  liveTrackPoints,
  allTripsPoints,
  settings,
  selectedTripPoints,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  const [activeLayerId, setActiveLayerId] = useState<string>(settings.defaultMapLayer || 'carto-dark');
  const [showLayerPicker, setShowLayerPicker] = useState(false);
  const [fogEnabled, setFogEnabled] = useState(true);
  const [autoFollow, setAutoFollow] = useState(true);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = currentPosition?.latitude || 48.8566;
    const initialLng = currentPosition?.longitude || 2.3522;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: true,
    });

    // Custom attribution positioning
    map.attributionControl.setPosition('bottomleft');

    const selectedLayer = MAP_LAYERS.find((l) => l.id === activeLayerId) || MAP_LAYERS[0];
    const tileLayer = L.tileLayer(selectedLayer.url, {
      attribution: selectedLayer.attribution,
      subdomains: selectedLayer.subdomains || ['abc'],
      maxZoom: selectedLayer.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapRef.current = map;

    // Redraw canvas on map move / zoom
    const handleMapChange = () => {
      drawFog();
    };

    map.on('move', handleMapChange);
    map.on('zoom', handleMapChange);
    map.on('resize', handleMapChange);

    // Disable auto-follow if user drags map manually
    map.on('dragstart', () => {
      setAutoFollow(false);
    });

    return () => {
      map.off('move', handleMapChange);
      map.off('zoom', handleMapChange);
      map.off('resize', handleMapChange);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    if (!mapRef.current) return;
    const selectedLayer = MAP_LAYERS.find((l) => l.id === activeLayerId) || MAP_LAYERS[0];

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    const newLayer = L.tileLayer(selectedLayer.url, {
      attribution: selectedLayer.attribution,
      subdomains: selectedLayer.subdomains || ['abc'],
      maxZoom: selectedLayer.maxZoom,
    }).addTo(mapRef.current);

    tileLayerRef.current = newLayer;
  }, [activeLayerId]);

  // Update User Marker & Live Tracking Position
  useEffect(() => {
    if (!mapRef.current || !currentPosition) return;
    const map = mapRef.current;
    const { latitude, longitude, accuracy, heading } = currentPosition;

    // Auto-center map if enabled
    if (autoFollow) {
      map.panTo([latitude, longitude], { animate: true, duration: 0.5 });
    }

    // User Location Pulse Marker
    const iconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 bg-cyan-500 rounded-full opacity-35 animate-ping"></div>
        <div class="w-5 h-5 bg-cyan-400 border-2 border-white rounded-full shadow-lg shadow-cyan-500/50 flex items-center justify-center">
          ${heading !== null && heading !== undefined ? `
            <div style="transform: rotate(${heading}deg)" class="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-white mb-0.5"></div>
          ` : '<div class="w-1.5 h-1.5 bg-white rounded-full"></div>'}
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: iconHtml,
      className: 'user-marker-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([latitude, longitude]);
      userMarkerRef.current.setIcon(userIcon);
    } else {
      userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    }

    // Accuracy Circle
    if (accuracy && accuracy < 150) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([latitude, longitude]);
        accuracyCircleRef.current.setRadius(accuracy);
      } else {
        accuracyCircleRef.current = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#00f2fe',
          weight: 1,
          opacity: 0.3,
          fillColor: '#00f2fe',
          fillOpacity: 0.08,
        }).addTo(map);
      }
    }
  }, [currentPosition, autoFollow]);

  // Center selected trip if available
  useEffect(() => {
    if (!mapRef.current || !selectedTripPoints || selectedTripPoints.length === 0) return;
    const bounds = L.latLngBounds(selectedTripPoints.map((p) => [p.latitude, p.longitude]));
    mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    setAutoFollow(false);
  }, [selectedTripPoints]);

  // Render Fog of War on Canvas overlay
  const drawFog = useCallback(() => {
    const canvas = canvasRef.current;
    const map = mapRef.current;
    if (!canvas || !map) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match display size exactly
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    if (!fogEnabled) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const projectPoint = (lat: number, lng: number) => {
      const pt = map.latLngToContainerPoint(L.latLng(lat, lng));
      return { x: pt.x, y: pt.y };
    };

    // Calculate pixel radius corresponding to real meters based on current zoom
    const center = map.getCenter();
    const zoom = map.getZoom();
    // Meters per pixel approximately: 156543.03392 * Math.cos(lat) / (2 ^ zoom)
    const metersPerPixel = (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom);
    const pixelRadius = Math.max(20, Math.min(180, (settings.fogRadiusMeters || 35) / metersPerPixel));

    // Combine all trips + selected trip
    const tripsToRender = [...allTripsPoints];
    if (selectedTripPoints && selectedTripPoints.length > 0) {
      tripsToRender.push(selectedTripPoints);
    }

    FogEngine.renderFogCanvas(
      ctx,
      canvas.width,
      canvas.height,
      projectPoint,
      tripsToRender,
      liveTrackPoints,
      settings.fogOpacity ?? 0.8,
      settings.fogColor || '#0a0e17',
      pixelRadius,
      settings.pathColor || '#00f2fe'
    );
  }, [allTripsPoints, liveTrackPoints, selectedTripPoints, settings, fogEnabled]);

  // Redraw fog whenever points or settings change
  useEffect(() => {
    drawFog();
  }, [drawFog, allTripsPoints, liveTrackPoints, selectedTripPoints, settings, fogEnabled]);

  // Recenter on user
  const handleRecenter = () => {
    if (mapRef.current && currentPosition) {
      mapRef.current.flyTo([currentPosition.latitude, currentPosition.longitude], 16, { duration: 0.8 });
      setAutoFollow(true);
    }
  };

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  return (
    <div className="relative w-full h-full overflow-hidden bg-cyber-dark">
      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Fog-of-War Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10 pointer-events-none w-full h-full transition-opacity duration-300"
      />

      {/* Map Action Quick Controls Floating On Right */}
      <div className="absolute right-4 top-20 z-20 flex flex-col gap-2.5">
        {/* Recenter / Auto-follow button */}
        <button
          onClick={handleRecenter}
          className={`p-3 rounded-2xl shadow-xl backdrop-blur-md border transition-all duration-200 flex items-center justify-center ${
            autoFollow
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-cyan-500/20'
              : 'bg-cyber-card/85 text-slate-300 border-cyber-border/70 hover:text-white'
          }`}
          title="Recenter on current location"
        >
          <Crosshair className={`w-5 h-5 ${autoFollow ? 'animate-spin-slow text-cyan-400' : ''}`} />
        </button>

        {/* Fog Toggle Button */}
        <button
          onClick={() => setFogEnabled(!fogEnabled)}
          className={`p-3 rounded-2xl shadow-xl backdrop-blur-md border transition-all duration-200 flex items-center justify-center ${
            fogEnabled
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              : 'bg-cyber-card/85 text-slate-400 border-cyber-border/70'
          }`}
          title={fogEnabled ? 'Fog of War: ON' : 'Fog of War: OFF'}
        >
          {fogEnabled ? <Eye className="w-5 h-5 text-indigo-400" /> : <EyeOff className="w-5 h-5" />}
        </button>

        {/* Map Layers Selector Button */}
        <div className="relative">
          <button
            onClick={() => setShowLayerPicker(!showLayerPicker)}
            className={`p-3 rounded-2xl shadow-xl backdrop-blur-md border transition-all duration-200 flex items-center justify-center ${
              showLayerPicker
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                : 'bg-cyber-card/85 text-slate-300 border-cyber-border/70 hover:text-white'
            }`}
            title="Choose Free Map Style"
          >
            <Layers className="w-5 h-5" />
          </button>

          {/* Layer Picker Dropdown */}
          {showLayerPicker && (
            <div className="absolute right-14 top-0 w-64 bg-cyber-card/95 backdrop-blur-xl border border-cyber-border rounded-2xl p-3 shadow-2xl z-30 flex flex-col gap-1.5 animate-fadeIn">
              <div className="text-xs font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Free Map Layers ($0)
              </div>
              {MAP_LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => {
                    setActiveLayerId(layer.id);
                    setShowLayerPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between ${
                    activeLayerId === layer.id
                      ? 'bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <span>{layer.name}</span>
                  {activeLayerId === layer.id && <span className="w-2 h-2 rounded-full bg-cyan-400"></span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zoom In / Out */}
        <div className="flex flex-col bg-cyber-card/85 backdrop-blur-md border border-cyber-border/70 rounded-2xl overflow-hidden shadow-xl">
          <button
            onClick={handleZoomIn}
            className="p-3 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="h-[1px] bg-cyber-border/60" />
          <button
            onClick={handleZoomOut}
            className="p-3 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

