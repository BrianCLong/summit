/**
 * Core geospatial and GeoJSON-adjacent types for the IntelGraph GEOINT platform.
 * These definitions deliberately avoid external type packages so that the
 * library can type-check in offline or restricted environments.
 */

export type Position = [number, number, number?];

export type PointGeometry = { type: 'Point'; coordinates: Position };
export type LineStringGeometry = { type: 'LineString'; coordinates: Position[] };
export type PolygonGeometry = { type: 'Polygon'; coordinates: Position[][] };
export type MultiPointGeometry = { type: 'MultiPoint'; coordinates: Position[] };
export type MultiLineStringGeometry = { type: 'MultiLineString'; coordinates: Position[][] };
export type MultiPolygonGeometry = { type: 'MultiPolygon'; coordinates: Position[][][] };
export type GeometryCollection = { type: 'GeometryCollection'; geometries: Geometry[] };

export type Geometry =
  | PointGeometry
  | LineStringGeometry
  | PolygonGeometry
  | MultiPointGeometry
  | MultiLineStringGeometry
  | MultiPolygonGeometry
  | GeometryCollection
  | null;

export interface CoordinateReferenceSystem {
  type: string;
  properties: {
    name: string;
  };
}

export interface BoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
  crs?: string;
}

export interface Feature<P = Record<string, unknown>> {
  type: 'Feature';
  geometry: Geometry;
  properties: P;
  id?: string;
  bbox?: BoundingBox;
}

export interface FeatureCollection<F extends Feature = Feature> {
  type: 'FeatureCollection';
  features: F[];
  bbox?: BoundingBox;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: Date;
  accuracy?: number;
  metadata?: Record<string, unknown>;
}

export interface IntelProperties extends Record<string, unknown> {
  entityId?: string;
  entityType?: string;
  classification?: string;
  timestamp?: string;
  source?: string;
  confidence?: number;
  tags?: string[];
}

export interface IntelFeature extends Feature<IntelProperties> {}

export interface IntelFeatureCollection extends FeatureCollection<IntelFeature> {
  metadata?: {
    source?: string;
    collectionDate?: string;
    classification?: string;
    crs?: CoordinateReferenceSystem;
    bbox?: BoundingBox;
  };
}

export interface Geofence {
  id: string;
  name: string;
  geometry: Exclude<Geometry, GeometryCollection | null>;
  type: 'entry' | 'exit' | 'dwell' | 'proximity';
  radius?: number;
  dwellTime?: number;
  enabled: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  entityId: string;
  eventType: 'entry' | 'exit' | 'dwell';
  timestamp: Date;
  location: GeoPoint;
  metadata?: Record<string, unknown>;
}

export interface MovementTrack {
  id: string;
  entityId: string;
  points: GeoPoint[];
  startTime: Date;
  endTime: Date;
  totalDistance?: number;
  averageSpeed?: number;
  metadata?: Record<string, unknown>;
}

export interface SpatialCluster {
  id: number;
  points: GeoPoint[];
  centroid: GeoPoint;
  radius: number;
  density: number;
  label?: string;
  noise?: boolean;
}

export interface Hotspot {
  location: GeoPoint;
  zScore: number;
  pValue: number;
  significance: 'high' | 'medium' | 'low' | 'none';
  count: number;
  radius: number;
}

export interface RouteSegment {
  id: string;
  start: GeoPoint;
  end: GeoPoint;
  distance: number;
  duration: number;
  geometry: Position[];
  instructions?: string;
  roadType?: string;
}

export interface Route {
  id: string;
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  waypoints: GeoPoint[];
  geometry: Position[];
  metadata?: Record<string, unknown>;
}

export interface Isochrone {
  center: GeoPoint;
  time: number;
  mode: 'walking' | 'driving' | 'cycling' | 'transit';
  geometry: Exclude<Geometry, GeometryCollection | null>;
  area?: number;
}

export interface ODFlow {
  origin: GeoPoint;
  destination: GeoPoint;
  count: number;
  entityIds?: string[];
  averageDuration?: number;
  geometry?: Position[];
}

export interface SpatialQueryOptions {
  bbox?: BoundingBox;
  maxDistance?: number;
  limit?: number;
  offset?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
}

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

export interface ReverseGeocodingResult extends GeocodingResult {
  distance: number;
}

export interface TerrainPoint extends GeoPoint {
  elevation: number;
  slope?: number;
  aspect?: number;
  terrain?: string;
}

export interface SatelliteImagery {
  id: string;
  source: string;
  captureDate: Date;
  bbox: BoundingBox;
  resolution: number;
  cloudCover?: number;
  bands?: string[];
  url?: string;
  tileUrl?: string;
  metadata?: Record<string, unknown>;
}

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

export interface SpatialIndexConfig {
  type: 'rtree' | 'quadtree' | 'geohash' | 'h3';
  precision?: number;
  maxItems?: number;
  maxDepth?: number;
}
