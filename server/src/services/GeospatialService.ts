import { getPostgresPool as _getPostgresPool } from '../config/database.js';
import pg from 'pg';
import { Pool } from 'pg';

// Export for testing
export const getPostgresPool = _getPostgresPool;

export const setPostgresPoolForTesting = (mockPool: any) => {
  (GeospatialService as any).instance.testPool = mockPool;
};

export interface GeoLocation {
  id?: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  metadata?: Record<string, any>;
}

export interface GeoRoute {
  id?: string;
  name?: string;
  coordinates: [number, number][]; // [lon, lat] for PostGIS convention in code, usually input as lat/lon but we handle conversion
  metadata?: Record<string, any>;
}

export interface GeoGeofence {
    id?: string;
    name: string;
    coordinates: [number, number][][]; // Polygon rings
    description?: string;
    metadata?: Record<string, any>;
}

export class GeospatialService {
  private static instance: GeospatialService;
  private testPool: any;

  private constructor() {}

  public static getInstance(): GeospatialService {
    if (!GeospatialService.instance) {
      GeospatialService.instance = new GeospatialService();
    }
    return GeospatialService.instance;
  }

  private getPool() {
      if (this.testPool) return this.testPool;
      return getPostgresPool();
  }

  /**
   * Add a new location point
   */
  async addLocation(location: GeoLocation): Promise<string> {
    const pool = this.getPool() as any;

    const query = `
      INSERT INTO geo_locations (name, category, location, metadata)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5)
      RETURNING id
    `;
    const values = [
      location.name,
      location.category,
      location.longitude, // PostGIS Point takes (x, y) -> (lon, lat)
      location.latitude,
      location.metadata || {}
    ];

    const result = await pool.query(query, values);
    return result.rows[0].id;
  }

  /**
   * Find locations within a certain radius (in meters)
   */
  async findNearby(latitude: number, longitude: number, radiusMeters: number): Promise<any[]> {
    const pool = this.getPool() as any;
    // ST_DWithin arguments: (geography, geography, meters)
    const query = `
      SELECT
        id,
        name,
        category,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        metadata,
        ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as distance
      FROM geo_locations
      WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)
      ORDER BY distance ASC
    `;
    const values = [longitude, latitude, radiusMeters];

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Add a route (LineString)
   * Coordinates are expected as [latitude, longitude] pairs for API input convenience,
   * but we store as (lon, lat)
   */
  async addRoute(name: string, coordinates: [number, number][], metadata: any = {}): Promise<string> {
    const pool = this.getPool() as any;
    // Convert [lat, lon] to "lon lat, lon lat" string for ST_GeomFromText/ST_MakeLine
    // Actually easier to construct array of points or use WKT
    // WKT format: LINESTRING(lon1 lat1, lon2 lat2, ...)

    const wktCoords = coordinates.map(coord => `${coord[1]} ${coord[0]}`).join(', ');
    const wkt = `LINESTRING(${wktCoords})`;

    const query = `
      INSERT INTO geo_routes (name, path, metadata)
      VALUES ($1, ST_GeomFromText($2, 4326)::geography, $3)
      RETURNING id
    `;
    const values = [name, wkt, metadata];

    const result = await pool.query(query, values);
    return result.rows[0].id;
  }

  /**
   * Check which geofences contain the given point
   */
  async checkGeofence(latitude: number, longitude: number): Promise<any[]> {
    const pool = this.getPool() as any;
    const query = `
      SELECT id, name, description, metadata
      FROM geo_geofences
      WHERE ST_Intersects(area, ST_SetSRID(ST_MakePoint($1, $2), 4326))
    `;
    const values = [longitude, latitude];

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Cluster locations based on a grid system (basic clustering)
   * @param zoom Approximate zoom level to determine grid size
   */
  async clusterLocations(zoom: number): Promise<any[]> {
    const pool = this.getPool() as any;

    // Crude approximation of grid size in degrees based on zoom
    // zoom 0 ~ 360 deg, zoom 1 ~ 180, ... zoom N ~ 360 / 2^N
    const gridSize = 360 / Math.pow(2, zoom);

    const query = `
      SELECT
        count(*) as point_count,
        ST_X(ST_SnapToGrid(location::geometry, $1)) as cluster_lon,
        ST_Y(ST_SnapToGrid(location::geometry, $1)) as cluster_lat
      FROM geo_locations
      GROUP BY cluster_lon, cluster_lat
    `;

    const result = await pool.query(query, [gridSize]);
    return result.rows;
  }

  /**
   * Mock Geocoding Service
   */
  async geocode(address: string): Promise<{lat: number, lon: number} | null> {
    // Mock implementation
    console.log(`Geocoding address: ${address}`);
    if (!address) return null;
    // Return a dummy location (San Francisco)
    return { lat: 37.7749, lon: -122.4194 };
  }

  /**
   * Mock Reverse Geocoding Service
   */
  async reverseGeocode(lat: number, lon: number): Promise<string> {
    // Mock implementation
    console.log(`Reverse geocoding: ${lat}, ${lon}`);
    return "123 Mock Street, San Francisco, CA";
  }

  /**
   * Simple TSP / Route Optimization
   * Nearest Neighbor heuristic
   */
  optimizeRoute(stops: {lat: number, lon: number, id: string}[]): {lat: number, lon: number, id: string}[] {
    if (stops.length <= 1) return stops;

    const unvisited = [...stops];
    const optimized = [unvisited.shift()!]; // Start with the first one

    while (unvisited.length > 0) {
      const current = optimized[optimized.length - 1];
      let nearestIndex = -1;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const candidate = unvisited[i];
        // Euclidean distance approx is fine for simple sort, or haversine
        const dist = Math.sqrt(
          Math.pow(candidate.lat - current.lat, 2) +
          Math.pow(candidate.lon - current.lon, 2)
        );

        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }

      if (nearestIndex !== -1) {
        optimized.push(unvisited[nearestIndex]);
        unvisited.splice(nearestIndex, 1);
      } else {
        // Should not happen unless unvisited is empty
        break;
      }
    }

    return optimized;
  }
}
