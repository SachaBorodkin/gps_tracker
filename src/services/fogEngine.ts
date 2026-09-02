import { GPSPoint, ExploredTile } from '../types';

export interface FogStats {
  exploredAreaSqm: number;
  exploredAreaKm2: number;
  totalPointsExplored: number;
  explorationLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelTitle: string;
}

const LEVEL_TITLES = [
  'Wanderer',
  'Neighborhood Scout',
  'Pathfinder',
  'Local Adventurer',
  'Urban Explorer',
  'Trailblazer',
  'Cartographer',
  'Voyager',
  'Territory Master',
  'Grand Pioneer',
  'Legendary Navigator'
];

export class FogEngine {
  // Discretize lat/lng to tile key at zoom level 16 (~30-50m cell size)
  public static latLngToTileKey(lat: number, lng: number, zoom: number = 16): string {
    const n = Math.pow(2, zoom);
    const radLat = (lat * Math.PI) / 180;
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor(
      ((1 - Math.log(Math.tan(radLat) + 1 / Math.cos(radLat)) / Math.PI) / 2) * n
    );
    return `z${zoom}_x${x}_y${y}`;
  }

  // Convert points into unique explored tiles
  public static extractExploredTiles(points: GPSPoint[], existingTilesMap: Map<string, number> = new Map()): ExploredTile[] {
    const newTilesMap = new Map<string, { count: number; lastVisited: number }>();

    for (const pt of points) {
      const tileKey = this.latLngToTileKey(pt.latitude, pt.longitude, 16);
      const existingCount = existingTilesMap.get(tileKey) || 0;
      const current = newTilesMap.get(tileKey) || { count: existingCount, lastVisited: pt.timestamp };
      
      newTilesMap.set(tileKey, {
        count: current.count + 1,
        lastVisited: Math.max(current.lastVisited, pt.timestamp),
      });
    }

    const result: ExploredTile[] = [];
    newTilesMap.forEach((val, key) => {
      result.push({
        tileKey: key,
        count: val.count,
        lastVisited: val.lastVisited,
      });
    });

    return result;
  }

  // Compute exploration stats and gamification level
  public static calculateFogStats(exploredTilesCount: number, totalDistanceMeters: number): FogStats {
    // Each tile at zoom 16 is approximately 1,600 m^2 (~40m x 40m)
    const areaPerTile = 1600;
    const exploredAreaSqm = exploredTilesCount * areaPerTile;
    const exploredAreaKm2 = Number((exploredAreaSqm / 1_000_000).toFixed(3));

    // XP calculation based on area explored + distance covered
    const totalXp = Math.floor(exploredAreaSqm / 50 + totalDistanceMeters / 10);
    
    // Level formula: level = floor(sqrt(XP / 100)) + 1
    const level = Math.max(1, Math.min(100, Math.floor(Math.sqrt(totalXp / 100)) + 1));
    const currentLevelBaseXp = Math.pow(level - 1, 2) * 100;
    const nextLevelTargetXp = Math.pow(level, 2) * 100;
    const currentLevelXp = Math.max(0, totalXp - currentLevelBaseXp);
    const xpNeeded = nextLevelTargetXp - currentLevelBaseXp;

    const titleIndex = Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 3));
    const levelTitle = LEVEL_TITLES[titleIndex];

    return {
      exploredAreaSqm,
      exploredAreaKm2,
      totalPointsExplored: exploredTilesCount,
      explorationLevel: level,
      currentLevelXp: Math.min(currentLevelXp, xpNeeded),
      nextLevelXp: xpNeeded,
      levelTitle,
    };
  }

  // Render Fog of War on Canvas
  public static renderFogCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    projectPoint: (lat: number, lng: number) => { x: number; y: number },
    allTripsPoints: GPSPoint[][],
    currentLivePoints: GPSPoint[],
    fogOpacity: number = 0.8,
    fogColor: string = '#0a0e17',
    revealRadiusPixels: number = 40,
    pathColor: string = '#00f2fe'
  ) {
    ctx.clearRect(0, 0, width, height);

    // 1. Fill entire canvas with dark fog
    ctx.save();
    ctx.fillStyle = fogColor;
    ctx.globalAlpha = fogOpacity;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 2. Punch holes through fog using 'destination-out'
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    const drawRevealCircle = (x: number, y: number, radius: number) => {
      if (x < -radius * 2 || x > width + radius * 2 || y < -radius * 2 || y > height + radius * 2) {
        return; // out of view bounds
      }
      const grad = ctx.createRadialGradient(x, y, radius * 0.25, x, y, radius);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawRevealPath = (pts: GPSPoint[], radius: number) => {
      if (pts.length === 0) return;

      // Draw thick path cutout
      ctx.lineWidth = radius * 1.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';

      ctx.beginPath();
      let started = false;
      for (const pt of pts) {
        const p = projectPoint(pt.latitude, pt.longitude);
        if (!started) {
          ctx.moveTo(p.x, p.y);
          started = true;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      if (started) {
        ctx.stroke();
      }

      // Add radial soft gradients at key vertices
      const step = Math.max(1, Math.floor(pts.length / 50));
      for (let i = 0; i < pts.length; i += step) {
        const p = projectPoint(pts[i].latitude, pts[i].longitude);
        drawRevealCircle(p.x, p.y, radius);
      }
    };

    // Unveil all historical trips
    for (const tripPoints of allTripsPoints) {
      drawRevealPath(tripPoints, revealRadiusPixels);
    }

    // Unveil current live recording trip
    if (currentLivePoints.length > 0) {
      drawRevealPath(currentLivePoints, revealRadiusPixels);
    }

    ctx.restore();

    // 3. Draw luminous neon routes on top of the clear areas
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    const drawLuminousLine = (pts: GPSPoint[], color: string, glow: boolean = true) => {
      if (pts.length < 2) return;

      if (glow) {
        // Outer Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.85;

        ctx.beginPath();
        let started = false;
        for (const pt of pts) {
          const p = projectPoint(pt.latitude, pt.longitude);
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();

        // Inner Bright Core
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.9;
        ctx.stroke();
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        let started = false;
        for (const pt of pts) {
          const p = projectPoint(pt.latitude, pt.longitude);
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      }
    };

    // Render historical routes
    for (const tripPoints of allTripsPoints) {
      drawLuminousLine(tripPoints, pathColor, false);
    }

    // Render active live route with glowing effect
    if (currentLivePoints.length > 1) {
      drawLuminousLine(currentLivePoints, '#00ff87', true);
    }

    ctx.restore();
  }
}

