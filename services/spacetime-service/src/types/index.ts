/**
 * Spacetime Engine Core Types
 *
 * All timestamps are in UTC milliseconds (Unix epoch).
 * All coordinates use WGS84 (EPSG:4326) unless otherwise specified.
 * All distances are in meters, all durations in milliseconds.
 */

import { z } from 'zod';
import type { Geometry, Point, Polygon, MultiPolygon } from 'geojson';

// =============================================================================
// CONSTANTS
// =============================================================================

export const COORDINATE_PRECISION = 7; // ~1cm precision
export const DEFAULT_COORDINATE_SYSTEM = 'EPSG:4326';
export const EARTH_RADIUS_METERS = 6371000;

// Query guard limits (configurable via SpacetimeConfig)
export const DEFAULT_MAX_QUERY_AREA_SQ_METERS = 1_000_000_000_000; // ~1M km²
export const DEFAULT_MAX_TIME_SPAN_MS = 365 * 24 * 60 * 60 * 1000; // 1 year
export const DEFAULT_MAX_RESULT_CARDINALITY = 10_000;
export const DEFAULT_MAX_ENTITIES_PER_QUERY = 1000;

// =============================================================================
// BASE SCHEMAS
// =============================================================================

/**
 * Geographic coordinate (WGS84)
 */
export const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevation: z.number().optional(),
  accuracy: z.number().nonnegative().optional(),
});

/**
 * Time window definition
 */
export const timeWindowSchema = z.object({
  start: z.number().int().nonnegative(), // UTC milliseconds
  end: z.number().int().nonnegative(), // UTC milliseconds
}).refine((data) => data.end >= data.start, {
  message: 'End time must be >= start time',
});

/**
 * Policy context for all spacetime queries
 */
export const policyContextSchema = z.object({
  tenantId: z.string().min(1),
  policyLabels: z.array(z.string()).default([]),
  userId: z.string().optional(),
  classification: z.string().optional(),
});

// =============================================================================
// CORE SPACETIME OBJECTS
// =============================================================================

/**
 * TimeEvent: A point-in-time occurrence for an entity
 */
export const timeEventSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().min(1),
  timestamp: z.number().int().nonnegative(), // UTC milliseconds
  location: coordinateSchema.optional(),
  eventType: z.string().min(1),
  attributes: z.record(z.string(), z.unknown()).default({}),
  tenantId: z.string().min(1),
  policyLabels: z.array(z.string()).default([]),
  provenance: z.object({
    source: z.string(),
    chain: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(1).default(1),
  }),
  createdAt: z.number().int().nonnegative(),
});

/**
 * Interval: A time span for an entity (e.g., "was at location from X to Y")
 */
export const intervalSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().min(1),
  start: z.number().int().nonnegative(), // UTC milliseconds
  end: z.number().int().nonnegative(), // UTC milliseconds
  location: coordinateSchema.optional(),
  intervalType: z.string().min(1),
  attributes: z.record(z.string(), z.unknown()).default({}),
  tenantId: z.string().min(1),
  policyLabels: z.array(z.string()).default([]),
  provenance: z.object({
    source: z.string(),
    chain: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(1).default(1),
  }),
  createdAt: z.number().int().nonnegative(),
}).refine((data) => data.end >= data.start, {
  message: 'End time must be >= start time',
});

/**
 * GeoPoint: A spatial point with optional temporal association
 */
export const geoPointSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().min(1),
  coordinate: coordinateSchema,
  timestamp: z.number().int().nonnegative().optional(),
  pointType: z.string().default('observation'),
  attributes: z.record(z.string(), z.unknown()).default({}),
  tenantId: z.string().min(1),
  policyLabels: z.array(z.string()).default([]),
  geohash: z.string().optional(), // Computed geohash for indexing
  createdAt: z.number().int().nonnegative(),
});

/**
 * GeoJSON geometry schema (subset we support)
 */
export const geoJsonGeometrySchema = z.object({
  type: z.enum(['Point', 'Polygon', 'MultiPolygon', 'LineString', 'MultiLineString']),
  coordinates: z.unknown(), // Validated at runtime based on type
});

/**
 * GeoShape: An arbitrary geographic region
 */
export const geoShapeSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().min(1).optional(), // Optional - shapes can be standalone
  geometry: geoJsonGeometrySchema,
  shapeType: z.enum(['region', 'geofence', 'boundary', 'area_of_interest']),
  name: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).default({}),
  tenantId: z.string().min(1),
  policyLabels: z.array(z.string()).default([]),
  validFrom: z.number().int().nonnegative().optional(),
  validTo: z.number().int().nonnegative().optional(),
  createdAt: z.number().int().nonnegative(),
});

/**
 * TrajectoryPoint: A single point in a trajectory
 */
export const trajectoryPointSchema = z.object({
  coordinate: coordinateSchema,
  timestamp: z.number().int().nonnegative(),
  speed: z.number().nonnegative().optional(), // m/s
  heading: z.number().min(0).max(360).optional(), // degrees
  attributes: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Trajectory: A sequence of time-ordered positions for an entity
 */
export const trajectorySchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().min(1),
  points: z.array(trajectoryPointSchema).min(1),
  startTime: z.number().int().nonnegative(),
  endTime: z.number().int().nonnegative(),
  totalDistance: z.number().nonnegative().optional(), // meters
  averageSpeed: z.number().nonnegative().optional(), // m/s
  maxSpeed: z.number().nonnegative().optional(), // m/s
  boundingBox: z.object({
    minLat: z.number(),
    maxLat: z.number(),
    minLon: z.number(),
    maxLon: z.number(),
  }).optional(),
  attributes: z.record(z.string(), z.unknown()).default({}),
  tenantId: z.string().min(1),
  policyLabels: z.array(z.string()).default([]),
  provenance: z.object({
    source: z.string(),
    chain: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(1).default(1),
  }),
  createdAt: z.number().int().nonnegative(),
}).refine((data) => data.endTime >= data.startTime, {
  message: 'End time must be >= start time',
});

// =============================================================================
// QUERY TYPES
// =============================================================================

/**
 * Co-presence query parameters
 */
export const coPresenceQuerySchema = z.object({
  entityIds: z.array(z.string().min(1)).min(2),
  timeWindow: timeWindowSchema,
  radius: z.number().positive(), // meters
  minOverlapDuration: z.number().int().nonnegative().default(0), // ms
  minConfidence: z.number().min(0).max(1).default(0),
  context: policyContextSchema,
});

/**
 * Entities in region query parameters
 */
export const entitiesInRegionQuerySchema = z.object({
  shape: geoJsonGeometrySchema,
  timeRange: timeWindowSchema.optional(),
  entityTypes: z.array(z.string()).optional(),
  limit: z.number().int().positive().default(1000),
  offset: z.number().int().nonnegative().default(0),
  context: policyContextSchema,
});

/**
 * Trajectory query parameters
 */
export const trajectoryQuerySchema = z.object({
  entityId: z.string().min(1),
  timeRange: timeWindowSchema,
  simplifyTolerance: z.number().nonnegative().optional(), // meters
  includeSpeed: z.boolean().default(true),
  includeHeading: z.boolean().default(true),
  context: policyContextSchema,
});

/**
 * Dwell detection query parameters
 */
export const dwellQuerySchema = z.object({
  entityId: z.string().min(1),
  area: geoJsonGeometrySchema,
  minDuration: z.number().int().positive(), // milliseconds
  timeRange: timeWindowSchema.optional(),
  maxGapDuration: z.number().int().nonnegative().default(300000), // 5 min default
  context: policyContextSchema,
});

/**
 * Spatial proximity query
 */
export const proximityQuerySchema = z.object({
  center: coordinateSchema,
  radius: z.number().positive(), // meters
  timeRange: timeWindowSchema.optional(),
  entityTypes: z.array(z.string()).optional(),
  limit: z.number().int().positive().default(100),
  context: policyContextSchema,
});

/**
 * K-nearest neighbors query
 */
export const knnQuerySchema = z.object({
  center: coordinateSchema,
  k: z.number().int().positive().max(1000),
  timeRange: timeWindowSchema.optional(),
  maxDistance: z.number().positive().optional(), // meters
  entityTypes: z.array(z.string()).optional(),
  context: policyContextSchema,
});

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Co-presence episode result
 */
export const coPresenceEpisodeSchema = z.object({
  id: z.string().uuid(),
  entityIds: z.array(z.string()),
  startTime: z.number().int().nonnegative(),
  endTime: z.number().int().nonnegative(),
  duration: z.number().int().nonnegative(), // milliseconds
  centroid: coordinateSchema,
  radius: z.number().nonnegative(), // meters - actual computed radius
  confidence: z.number().min(0).max(1),
  overlapCount: z.number().int().positive(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Dwell detection result
 */
export const dwellEpisodeSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string(),
  areaId: z.string().optional(),
  startTime: z.number().int().nonnegative(),
  endTime: z.number().int().nonnegative(),
  duration: z.number().int().nonnegative(), // milliseconds
  centroid: coordinateSchema,
  pointCount: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
});

/**
 * Entity in region result
 */
export const entityInRegionResultSchema = z.object({
  entityId: z.string(),
  firstSeen: z.number().int().nonnegative(),
  lastSeen: z.number().int().nonnegative(),
  observationCount: z.number().int().positive(),
  centroid: coordinateSchema.optional(),
  distance: z.number().nonnegative().optional(), // from query center if applicable
});

/**
 * Spacetime summary for Analytics/Copilot
 */
export const spacetimeSummarySchema = z.object({
  entityId: z.string(),
  timeRange: timeWindowSchema,
  statistics: z.object({
    totalObservations: z.number().int().nonnegative(),
    uniqueLocations: z.number().int().nonnegative(),
    totalDistance: z.number().nonnegative(), // meters
    averageSpeed: z.number().nonnegative().optional(), // m/s
    maxSpeed: z.number().nonnegative().optional(), // m/s
    dwellCount: z.number().int().nonnegative(),
    totalDwellTime: z.number().int().nonnegative(), // ms
  }),
  boundingBox: z.object({
    minLat: z.number(),
    maxLat: z.number(),
    minLon: z.number(),
    maxLon: z.number(),
  }).optional(),
  primaryLocations: z.array(z.object({
    coordinate: coordinateSchema,
    visitCount: z.number().int().positive(),
    totalDuration: z.number().int().nonnegative(),
    label: z.string().optional(),
  })).optional(),
  coPresencePartners: z.array(z.object({
    entityId: z.string(),
    episodeCount: z.number().int().positive(),
    totalDuration: z.number().int().nonnegative(),
  })).optional(),
});

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Spacetime engine configuration
 */
export const spacetimeConfigSchema = z.object({
  maxQueryAreaSqMeters: z.number().positive().default(DEFAULT_MAX_QUERY_AREA_SQ_METERS),
  maxTimeSpanMs: z.number().positive().default(DEFAULT_MAX_TIME_SPAN_MS),
  maxResultCardinality: z.number().int().positive().default(DEFAULT_MAX_RESULT_CARDINALITY),
  maxEntitiesPerQuery: z.number().int().positive().default(DEFAULT_MAX_ENTITIES_PER_QUERY),
  geohashPrecision: z.number().int().min(1).max(12).default(7),
  defaultConfidenceThreshold: z.number().min(0).max(1).default(0.5),
  enableQueryLogging: z.boolean().default(true),
  retentionPolicyDays: z.number().int().positive().optional(),
});

// =============================================================================
// DERIVED EVENT TYPES (for Graph Core integration)
// =============================================================================

/**
 * Derived event reference for Graph Core ingestion
 */
export const derivedEventReferenceSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['co_presence', 'dwell', 'trajectory_segment', 'anomaly']),
  sourceEntityIds: z.array(z.string()),
  timeRange: timeWindowSchema,
  location: coordinateSchema.optional(),
  confidence: z.number().min(0).max(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
  tenantId: z.string(),
  policyLabels: z.array(z.string()).default([]),
  generatedAt: z.number().int().nonnegative(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Coordinate = z.infer<typeof coordinateSchema>;
export type TimeWindow = z.infer<typeof timeWindowSchema>;
export type PolicyContext = z.infer<typeof policyContextSchema>;
export type TimeEvent = z.infer<typeof timeEventSchema>;
export type Interval = z.infer<typeof intervalSchema>;
export type GeoPoint = z.infer<typeof geoPointSchema>;
export type GeoJsonGeometry = z.infer<typeof geoJsonGeometrySchema>;
export type GeoShape = z.infer<typeof geoShapeSchema>;
export type TrajectoryPoint = z.infer<typeof trajectoryPointSchema>;
export type Trajectory = z.infer<typeof trajectorySchema>;
export type CoPresenceQuery = z.infer<typeof coPresenceQuerySchema>;
export type EntitiesInRegionQuery = z.infer<typeof entitiesInRegionQuerySchema>;
export type TrajectoryQuery = z.infer<typeof trajectoryQuerySchema>;
export type DwellQuery = z.infer<typeof dwellQuerySchema>;
export type ProximityQuery = z.infer<typeof proximityQuerySchema>;
export type KnnQuery = z.infer<typeof knnQuerySchema>;
export type CoPresenceEpisode = z.infer<typeof coPresenceEpisodeSchema>;
export type DwellEpisode = z.infer<typeof dwellEpisodeSchema>;
export type EntityInRegionResult = z.infer<typeof entityInRegionResultSchema>;
export type SpacetimeSummary = z.infer<typeof spacetimeSummarySchema>;
export type SpacetimeConfig = z.infer<typeof spacetimeConfigSchema>;
export type DerivedEventReference = z.infer<typeof derivedEventReferenceSchema>;

// Re-export GeoJSON types for convenience
export type { Geometry, Point, Polygon, MultiPolygon };

// =============================================================================
// UTILITY TYPE GUARDS
// =============================================================================

export function isTimeEvent(obj: unknown): obj is TimeEvent {
  return timeEventSchema.safeParse(obj).success;
}

export function isInterval(obj: unknown): obj is Interval {
  return intervalSchema.safeParse(obj).success;
}

export function isTrajectory(obj: unknown): obj is Trajectory {
  return trajectorySchema.safeParse(obj).success;
}

export function isGeoPoint(obj: unknown): obj is GeoPoint {
  return geoPointSchema.safeParse(obj).success;
}

export function isGeoShape(obj: unknown): obj is GeoShape {
  return geoShapeSchema.safeParse(obj).success;
}
