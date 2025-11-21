/**
 * Core geospatial types for IntelGraph GEOINT platform
 */

import { Feature, FeatureCollection, GeoJsonProperties, Geometry, Position } from 'geojson';

/**
 * Coordinate reference system
 */
export interface CoordinateReferenceSystem {
  type: string;
  properties: {
    name: string;
  };
}

/**
 * Bounding box for spatial extent
 */
export interface BoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
  crs?: string;
}

/**
 * Geographic point with optional elevation and timestamp
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: Date;
  accuracy?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Geographic feature with intelligence metadata
 */
export interface IntelFeature extends Feature {
  properties: GeoJsonProperties & {
    entityId?: string;
    entityType?: string;
    classification?: string;
    timestamp?: string;
    source?: string;
    confidence?: number;
    tags?: string[];
  };
}

/**
 * Feature collection with intelligence context
 */
export interface IntelFeatureCollection extends FeatureCollection {
  features: IntelFeature[];
  metadata?: {
    source?: string;
    collectionDate?: string;
    classification?: string;
    crs?: CoordinateReferenceSystem;
    bbox?: BoundingBox;
  };
}

/**
 * Geofence definition
 */
export interface Geofence {
  id: string;
  name: string;
  geometry: Geometry;
  type: 'entry' | 'exit' | 'dwell' | 'proximity';
  radius?: number; // meters for proximity geofences
  dwellTime?: number; // milliseconds for dwell geofences
  enabled: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Geofence event
 */
export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  entityId: string;
  eventType: 'entry' | 'exit' | 'dwell';
  timestamp: Date;
  location: GeoPoint;
  metadata?: Record<string, unknown>;
}

/**
 * Movement track
 */
export interface MovementTrack {
  id: string;
  entityId: string;
  points: GeoPoint[];
  startTime: Date;
  endTime: Date;
  totalDistance?: number; // meters
  averageSpeed?: number; // m/s
  metadata?: Record<string, unknown>;
}

/**
 * Spatial cluster result
 */
export interface SpatialCluster {
  id: number;
  points: GeoPoint[];
  centroid: GeoPoint;
  radius: number; // meters
  density: number;
  label?: string;
  noise?: boolean;
}

/**
 * Hotspot analysis result
 */
export interface Hotspot {
  location: GeoPoint;
  zScore: number;
  pValue: number;
  significance: 'high' | 'medium' | 'low' | 'none';
  count: number;
  radius: number; // meters
}

/**
 * Route segment
 */
export interface RouteSegment {
  id: string;
  start: GeoPoint;
  end: GeoPoint;
  distance: number; // meters
  duration: number; // seconds
  geometry: Position[];
  instructions?: string;
  roadType?: string;
}

/**
 * Complete route
 */
export interface Route {
  id: string;
  segments: RouteSegment[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  waypoints: GeoPoint[];
  geometry: Position[];
  metadata?: Record<string, unknown>;
}

/**
 * Isochrone (time-based accessibility zone)
 */
export interface Isochrone {
  center: GeoPoint;
  time: number; // seconds
  mode: 'walking' | 'driving' | 'cycling' | 'transit';
  geometry: Geometry;
  area?: number; // square meters
}

/**
 * Origin-destination flow
 */
export interface ODFlow {
  origin: GeoPoint;
  destination: GeoPoint;
  count: number;
  entityIds?: string[];
  averageDuration?: number; // seconds
  geometry?: Position[];
}

/**
 * Spatial query options
 */
export interface SpatialQueryOptions {
  bbox?: BoundingBox;
  maxDistance?: number; // meters
  limit?: number;
  offset?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
}

/**
 * Geocoding result
 */
export interface GeocodingResult {
  location: GeoPoint;
  formattedAddress: string;
  addressComponents: {
    streetNumber?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  confidence: number;
  source: string;
  bbox?: BoundingBox;
}

/**
 * Reverse geocoding result
 */
export interface ReverseGeocodingResult extends GeocodingResult {
  distance: number; // meters from query point
}

/**
 * Terrain data point
 */
export interface TerrainPoint extends GeoPoint {
  elevation: number;
  slope?: number; // degrees
  aspect?: number; // degrees (0-360)
  terrain?: string; // terrain type
}

/**
 * Satellite imagery metadata
 */
export interface SatelliteImagery {
  id: string;
  source: string;
  captureDate: Date;
  bbox: BoundingBox;
  resolution: number; // meters per pixel
  cloudCover?: number; // percentage
  bands?: string[];
  url?: string;
  tileUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Map layer configuration
 */
export interface MapLayer {
  id: string;
  name: string;
  type: 'tile' | 'vector' | 'heatmap' | 'cluster' | 'geojson' | '3d';
  visible: boolean;
  opacity: number;
  zIndex: number;
  source: string | IntelFeatureCollection;
  style?: Record<string, unknown>;
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Spatial index configuration
 */
export interface SpatialIndexConfig {
  type: 'rtree' | 'quadtree' | 'geohash' | 'h3';
  precision?: number;
  maxItems?: number;
  maxDepth?: number;
}
