import { Trip, GPSPoint } from '../types';

export class GPXService {
  public static exportToGPX(trip: Trip, points: GPSPoint[]): string {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FogTracker" xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${this.escapeXml(trip.title)}</name>
    <time>${new Date(trip.startTime).toISOString()}</time>
  </metadata>
  <trk>
    <name>${this.escapeXml(trip.title)}</name>
    <type>${trip.transportMode}</type>
    <trkseg>
`;

    let trkpts = '';
    for (const pt of points) {
      const timeStr = new Date(pt.timestamp).toISOString();
      const ele = pt.altitude !== undefined && pt.altitude !== null ? `        <ele>${pt.altitude.toFixed(1)}</ele>\n` : '';
      const speed = pt.speed !== undefined && pt.speed !== null ? `        <speed>${pt.speed.toFixed(2)}</speed>\n` : '';
      trkpts += `      <trkpt lat="${pt.latitude}" lon="${pt.longitude}">
${ele}${speed}        <time>${timeStr}</time>
      </trkpt>\n`;
    }

    const xmlFooter = `    </trkseg>
  </trk>
</gpx>`;

    return xmlHeader + trkpts + xmlFooter;
  }

  public static exportToGeoJSON(trip: Trip, points: GPSPoint[]): string {
    const coordinates = points.map((p) => [p.longitude, p.latitude, p.altitude || 0]);
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: trip.id,
            title: trip.title,
            transportMode: trip.transportMode,
            startTime: trip.startTime,
            endTime: trip.endTime,
            distanceMeters: trip.distanceMeters,
            durationSeconds: trip.durationSeconds,
            avgSpeedKmh: trip.avgSpeedKmh,
            maxSpeedKmh: trip.maxSpeedKmh,
          },
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      ],
    };
    return JSON.stringify(geojson, null, 2);
  }

  public static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public static parseGPX(xmlText: string): { title: string; points: GPSPoint[] } {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const nameNode = xmlDoc.querySelector('name') || xmlDoc.querySelector('trk > name');
    const title = nameNode?.textContent || 'Imported GPX Track';

    const trkptNodes = xmlDoc.querySelectorAll('trkpt');
    const points: GPSPoint[] = [];

    trkptNodes.forEach((node) => {
      const lat = parseFloat(node.getAttribute('lat') || '0');
      const lon = parseFloat(node.getAttribute('lon') || '0');
      const eleNode = node.querySelector('ele');
      const timeNode = node.querySelector('time');
      const speedNode = node.querySelector('speed');

      const alt = eleNode ? parseFloat(eleNode.textContent || '0') : null;
      const timestamp = timeNode && timeNode.textContent ? new Date(timeNode.textContent).getTime() : Date.now();
      const speed = speedNode ? parseFloat(speedNode.textContent || '0') : null;

      if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
        points.push({
          latitude: lat,
          longitude: lon,
          altitude: alt,
          speed: speed,
          timestamp,
        });
      }
    });

    return { title, points };
  }

  private static escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}

