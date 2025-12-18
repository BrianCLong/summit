
import * as turf from '@turf/turf';
import { getDistance, getRhumbLineBearing, computeDestinationPoint } from 'geolib';
import { z } from 'zod';

// --- Zod Schemas ---

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  elevation: z.number().optional(),
  timestamp: z.string().datetime().optional(), // ISO 8601
});

export const TrackSchema = z.array(GeoPointSchema).min(2);

export const PolygonSchema = z.array(z.array(z.number())).min(3); // Leaflet/Turf style [[lon, lat], ...]

// Manually define the type to avoid Zod inference issues in this specific environment configuration
export type GeoPoint = {
  lat: number;
  lon: number;
  elevation?: number;
  timestamp?: string;
};

// --- Service ---

/**
 * Service for Geospatial Intelligence (GEOINT) operations.
 * Handles satellite analysis simulation, change detection, and spatial calculations.
 */
class GeoIntService {
  private static instance: GeoIntService;

  private constructor() {}

  public static getInstance(): GeoIntService {
    if (!GeoIntService.instance) {
      GeoIntService.instance = new GeoIntService();
    }
    return GeoIntService.instance;
  }

  /**
   * Simulates satellite imagery analysis.
   * @param imageUrl URL of the satellite image
   */
  public async analyzeSatelliteImage(imageUrl: string): Promise<any> {
    // Input validation (basic check)
    if (!imageUrl || !imageUrl.startsWith('http')) {
        throw new Error("Invalid image URL");
    }

    // Mock simulation
    return {
      classification: "Urban/Industrial",
      objectsDetected: [
        { type: "Vehicle", confidence: 0.89, location: { lat: 34.0522, lon: -118.2437 } },
        { type: "Building", confidence: 0.95, location: { lat: 34.0525, lon: -118.2440 } }
      ],
      cloudCover: 0.12,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Detects changes between two images (simulated).
   */
  public async detectChange(beforeImageUrl: string, afterImageUrl: string): Promise<any> {
    if (!beforeImageUrl || !afterImageUrl) throw new Error("Missing image URLs");

    // Mock simulation
    return {
        changeDetected: true,
        percentageChange: 15.4,
        areas: [
            { type: "New Construction", confidence: 0.92, bounds: { lat: 34.0530, lon: -118.2450 } }
        ]
    };
  }

  /**
   * Checks if a point is within a geofence.
   */
  public checkGeofence(pointLat: number, pointLon: number, polygonCoords: number[][]): boolean {
    const point = turf.point([pointLon, pointLat]);

    // Ensure polygon is closed for turf
    const validPoly = [...polygonCoords];
    if (validPoly.length > 0) {
        const first = validPoly[0];
        const last = validPoly[validPoly.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            validPoly.push(first);
        }
    }

    const polygon = turf.polygon([validPoly]);
    return turf.booleanPointInPolygon(point, polygon);
  }

  /**
   * Analyzes movement patterns from a track.
   * Calculates total distance, max speed, average speed, and bearings.
   */
  public analyzeMovement(trackPoints: GeoPoint[]): any {
    const parseResult = TrackSchema.safeParse(trackPoints);
    if (!parseResult.success) {
        throw new Error("Invalid track data: " + parseResult.error.message);
    }

    let totalDistance = 0;
    let maxSpeed = 0;
    const segments: any[] = [];

    for (let i = 0; i < trackPoints.length - 1; i++) {
        const p1 = trackPoints[i];
        const p2 = trackPoints[i+1];

        const dist = getDistance(
            { latitude: p1.lat, longitude: p1.lon },
            { latitude: p2.lat, longitude: p2.lon }
        );
        totalDistance += dist;

        let speed = 0;
        let timeDiff = 0;

        if (p1.timestamp && p2.timestamp) {
            timeDiff = (new Date(p2.timestamp).getTime() - new Date(p1.timestamp).getTime()) / 1000;
            if (timeDiff > 0) {
                speed = dist / timeDiff; // m/s
                if (speed > maxSpeed) maxSpeed = speed;
            }
        }

        const bearing = getRhumbLineBearing(
             { latitude: p1.lat, longitude: p1.lon },
             { latitude: p2.lat, longitude: p2.lon }
        );

        segments.push({
            fromIndex: i,
            toIndex: i+1,
            distanceMeters: dist,
            speedMps: speed,
            bearingDegrees: bearing
        });
    }

    const avgSpeed = trackPoints.length > 1 && segments.length > 0
        ? segments.reduce((acc, s) => acc + s.speedMps, 0) / segments.length
        : 0;

    return {
        totalDistanceMeters: totalDistance,
        maxSpeedMps: maxSpeed,
        avgSpeedMps: avgSpeed,
        pattern: maxSpeed > 30 ? "High Speed Transit" : (avgSpeed < 1 ? "Stationary/Loitering" : "Patrol"),
        segments
    };
  }

  /**
   * Transforms coordinates between systems.
   * Mock implementation of EPSG transformation.
   */
  public transformCoordinates(lat: number, lon: number, fromSys: string, toSys: string): { lat: number, lon: number, x?: number, y?: number } {
      // Real impl would use proj4
      // Mocking a conversion from WGS84 (EPSG:4326) to Web Mercator (EPSG:3857)
      if (fromSys === 'EPSG:4326' && toSys === 'EPSG:3857') {
          const x = lon * 20037508.34 / 180;
          let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
          y = y * 20037508.34 / 180;
          return { lat, lon, x, y };
      }
      return { lat, lon };
  }

  /**
   * Generates a simulated elevation profile for a path.
   * Uses simulated Perlin-like noise to create terrain data.
   */
  public getElevationProfile(path: GeoPoint[]): { distance: number, elevation: number, lat: number, lon: number }[] {
      if (path.length < 2) return [];

      const profile = [];
      let currentDist = 0;

      // Seed elevation
      let currentElev = 100 + Math.random() * 500;

      profile.push({
          distance: 0,
          elevation: currentElev,
          lat: path[0].lat,
          lon: path[0].lon
      });

      for (let i = 0; i < path.length - 1; i++) {
          const p1 = path[i];
          const p2 = path[i+1];
          const legDist = getDistance(
            { latitude: p1.lat, longitude: p1.lon },
            { latitude: p2.lat, longitude: p2.lon }
          );

          // Interpolate points for smoother profile
          const steps = Math.max(5, Math.floor(legDist / 100)); // Sample every ~100m or at least 5 points

          for (let step = 1; step <= steps; step++) {
             const fraction = step / steps;
             const stepDist = (legDist * fraction);

             // Simple random walk for elevation simulation
             const change = (Math.random() - 0.5) * 20; // +/- 10m change
             currentElev += change;
             if (currentElev < 0) currentElev = 0;

             // Interpolate lat/lon
             const lat = p1.lat + (p2.lat - p1.lat) * fraction;
             const lon = p1.lon + (p2.lon - p1.lon) * fraction;

             profile.push({
                 distance: currentDist + stepDist,
                 elevation: parseFloat(currentElev.toFixed(1)),
                 lat,
                 lon
             });
          }
          currentDist += legDist;
      }
      return profile;
  }
}

export const geoIntService = GeoIntService.getInstance();
