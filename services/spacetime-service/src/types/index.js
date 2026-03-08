"use strict";
/**
 * Spacetime Engine Core Types
 *
 * All timestamps are in UTC milliseconds (Unix epoch).
 * All coordinates use WGS84 (EPSG:4326) unless otherwise specified.
 * All distances are in meters, all durations in milliseconds.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.derivedEventReferenceSchema = exports.spacetimeConfigSchema = exports.spacetimeSummarySchema = exports.entityInRegionResultSchema = exports.dwellEpisodeSchema = exports.coPresenceEpisodeSchema = exports.knnQuerySchema = exports.proximityQuerySchema = exports.dwellQuerySchema = exports.trajectoryQuerySchema = exports.entitiesInRegionQuerySchema = exports.coPresenceQuerySchema = exports.trajectorySchema = exports.trajectoryPointSchema = exports.geoShapeSchema = exports.geoJsonGeometrySchema = exports.geoPointSchema = exports.intervalSchema = exports.timeEventSchema = exports.policyContextSchema = exports.timeWindowSchema = exports.coordinateSchema = exports.DEFAULT_MAX_ENTITIES_PER_QUERY = exports.DEFAULT_MAX_RESULT_CARDINALITY = exports.DEFAULT_MAX_TIME_SPAN_MS = exports.DEFAULT_MAX_QUERY_AREA_SQ_METERS = exports.EARTH_RADIUS_METERS = exports.DEFAULT_COORDINATE_SYSTEM = exports.COORDINATE_PRECISION = void 0;
exports.isTimeEvent = isTimeEvent;
exports.isInterval = isInterval;
exports.isTrajectory = isTrajectory;
exports.isGeoPoint = isGeoPoint;
exports.isGeoShape = isGeoShape;
const zod_1 = require("zod");
// =============================================================================
// CONSTANTS
// =============================================================================
exports.COORDINATE_PRECISION = 7; // ~1cm precision
exports.DEFAULT_COORDINATE_SYSTEM = 'EPSG:4326';
exports.EARTH_RADIUS_METERS = 6371000;
// Query guard limits (configurable via SpacetimeConfig)
exports.DEFAULT_MAX_QUERY_AREA_SQ_METERS = 1_000_000_000_000; // ~1M km²
exports.DEFAULT_MAX_TIME_SPAN_MS = 365 * 24 * 60 * 60 * 1000; // 1 year
exports.DEFAULT_MAX_RESULT_CARDINALITY = 10_000;
exports.DEFAULT_MAX_ENTITIES_PER_QUERY = 1000;
// =============================================================================
// BASE SCHEMAS
// =============================================================================
/**
 * Geographic coordinate (WGS84)
 */
exports.coordinateSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    elevation: zod_1.z.number().optional(),
    accuracy: zod_1.z.number().nonnegative().optional(),
});
/**
 * Time window definition
 */
exports.timeWindowSchema = zod_1.z.object({
    start: zod_1.z.number().int().nonnegative(), // UTC milliseconds
    end: zod_1.z.number().int().nonnegative(), // UTC milliseconds
}).refine((data) => data.end >= data.start, {
    message: 'End time must be >= start time',
});
/**
 * Policy context for all spacetime queries
 */
exports.policyContextSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    policyLabels: zod_1.z.array(zod_1.z.string()).default([]),
    userId: zod_1.z.string().optional(),
    classification: zod_1.z.string().optional(),
});
// =============================================================================
// CORE SPACETIME OBJECTS
// =============================================================================
/**
 * TimeEvent: A point-in-time occurrence for an entity
 */
exports.timeEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    entityId: zod_1.z.string().min(1),
    timestamp: zod_1.z.number().int().nonnegative(), // UTC milliseconds
    location: exports.coordinateSchema.optional(),
    eventType: zod_1.z.string().min(1),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    tenantId: zod_1.z.string().min(1),
    policyLabels: zod_1.z.array(zod_1.z.string()).default([]),
    provenance: zod_1.z.object({
        source: zod_1.z.string(),
        chain: zod_1.z.array(zod_1.z.string()).default([]),
        confidence: zod_1.z.number().min(0).max(1).default(1),
    }),
    createdAt: zod_1.z.number().int().nonnegative(),
});
/**
 * Interval: A time span for an entity (e.g., "was at location from X to Y")
 */
exports.intervalSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    entityId: zod_1.z.string().min(1),
    start: zod_1.z.number().int().nonnegative(), // UTC milliseconds
    end: zod_1.z.number().int().nonnegative(), // UTC milliseconds
    location: exports.coordinateSchema.optional(),
    intervalType: zod_1.z.string().min(1),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    tenantId: zod_1.z.string().min(1),
    policyLabels: zod_1.z.array(zod_1.z.string()).default([]),
    provenance: zod_1.z.object({
        source: zod_1.z.string(),
        chain: zod_1.z.array(zod_1.z.string()).default([]),
        confidence: zod_1.z.number().min(0).max(1).default(1),
    }),
    createdAt: zod_1.z.number().int().nonnegative(),
}).refine((data) => data.end >= data.start, {
    message: 'End time must be >= start time',
});
/**
 * GeoPoint: A spatial point with optional temporal association
 */
exports.geoPointSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    entityId: zod_1.z.string().min(1),
    coordinate: exports.coordinateSchema,
    timestamp: zod_1.z.number().int().nonnegative().optional(),
    pointType: zod_1.z.string().default('observation'),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    tenantId: zod_1.z.string().min(1),
    policyLabels: zod_1.z.array(zod_1.z.string()).default([]),
    geohash: zod_1.z.string().optional(), // Computed geohash for indexing
    createdAt: zod_1.z.number().int().nonnegative(),
});
/**
 * GeoJSON geometry schema (subset we support)
 */
exports.geoJsonGeometrySchema = zod_1.z.object({
    type: zod_1.z.enum(['Point', 'Polygon', 'MultiPolygon', 'LineString', 'MultiLineString']),
    coordinates: zod_1.z.unknown(), // Validated at runtime based on type
});
/**
 * GeoShape: An arbitrary geographic region
 */
exports.geoShapeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    entityId: zod_1.z.string().min(1).optional(), // Optional - shapes can be standalone
    geometry: exports.geoJsonGeometrySchema,
    shapeType: zod_1.z.enum(['region', 'geofence', 'boundary', 'area_of_interest']),
    name: zod_1.z.string().optional(),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    tenantId: zod_1.z.string().min(1),
    policyLabels: zod_1.z.array(zod_1.z.string()).default([]),
    validFrom: zod_1.z.number().int().nonnegative().optional(),
    validTo: zod_1.z.number().int().nonnegative().optional(),
    createdAt: zod_1.z.number().int().nonnegative(),
});
/**
 * TrajectoryPoint: A single point in a trajectory
 */
exports.trajectoryPointSchema = zod_1.z.object({
    coordinate: exports.coordinateSchema,
    timestamp: zod_1.z.number().int().nonnegative(),
    speed: zod_1.z.number().nonnegative().optional(), // m/s
    heading: zod_1.z.number().min(0).max(360).optional(), // degrees
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
});
/**
 * Trajectory: A sequence of time-ordered positions for an entity
 */
exports.trajectorySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    entityId: zod_1.z.string().min(1),
    points: zod_1.z.array(exports.trajectoryPointSchema).min(1),
    startTime: zod_1.z.number().int().nonnegative(),
    endTime: zod_1.z.number().int().nonnegative(),
    totalDistance: zod_1.z.number().nonnegative().optional(), // meters
    averageSpeed: zod_1.z.number().nonnegative().optional(), // m/s
    maxSpeed: zod_1.z.number().nonnegative().optional(), // m/s
    boundingBox: zod_1.z.object({
        minLat: zod_1.z.number(),
        maxLat: zod_1.z.number(),
        minLon: zod_1.z.number(),
        maxLon: zod_1.z.number(),
    }).optional(),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    tenantId: zod_1.z.string().min(1),
    policyLabels: zod_1.z.array(zod_1.z.string()).default([]),
    provenance: zod_1.z.object({
        source: zod_1.z.string(),
        chain: zod_1.z.array(zod_1.z.string()).default([]),
        confidence: zod_1.z.number().min(0).max(1).default(1),
    }),
    createdAt: zod_1.z.number().int().nonnegative(),
}).refine((data) => data.endTime >= data.startTime, {
    message: 'End time must be >= start time',
});
// =============================================================================
// QUERY TYPES
// =============================================================================
/**
 * Co-presence query parameters
 */
exports.coPresenceQuerySchema = zod_1.z.object({
    entityIds: zod_1.z.array(zod_1.z.string().min(1)).min(2),
    timeWindow: exports.timeWindowSchema,
    radius: zod_1.z.number().positive(), // meters
    minOverlapDuration: zod_1.z.number().int().nonnegative().default(0), // ms
    minConfidence: zod_1.z.number().min(0).max(1).default(0),
    context: exports.policyContextSchema,
});
/**
 * Entities in region query parameters
 */
exports.entitiesInRegionQuerySchema = zod_1.z.object({
    shape: exports.geoJsonGeometrySchema,
    timeRange: exports.timeWindowSchema.optional(),
    entityTypes: zod_1.z.array(zod_1.z.string()).optional(),
    limit: zod_1.z.number().int().positive().default(1000),
    offset: zod_1.z.number().int().nonnegative().default(0),
    context: exports.policyContextSchema,
});
/**
 * Trajectory query parameters
 */
exports.trajectoryQuerySchema = zod_1.z.object({
    entityId: zod_1.z.string().min(1),
    timeRange: exports.timeWindowSchema,
    simplifyTolerance: zod_1.z.number().nonnegative().optional(), // meters
    includeSpeed: zod_1.z.boolean().default(true),
    includeHeading: zod_1.z.boolean().default(true),
    context: exports.policyContextSchema,
});
/**
 * Dwell detection query parameters
 */
exports.dwellQuerySchema = zod_1.z.object({
    entityId: zod_1.z.string().min(1),
    area: exports.geoJsonGeometrySchema,
    minDuration: zod_1.z.number().int().positive(), // milliseconds
    timeRange: exports.timeWindowSchema.optional(),
    maxGapDuration: zod_1.z.number().int().nonnegative().default(300000), // 5 min default
    context: exports.policyContextSchema,
});
/**
 * Spatial proximity query
 */
exports.proximityQuerySchema = zod_1.z.object({
    center: exports.coordinateSchema,
    radius: zod_1.z.number().positive(), // meters
    timeRange: exports.timeWindowSchema.optional(),
    entityTypes: zod_1.z.array(zod_1.z.string()).optional(),
    limit: zod_1.z.number().int().positive().default(100),
    context: exports.policyContextSchema,
});
/**
 * K-nearest neighbors query
 */
exports.knnQuerySchema = zod_1.z.object({
    center: exports.coordinateSchema,
    k: zod_1.z.number().int().positive().max(1000),
    timeRange: exports.timeWindowSchema.optional(),
    maxDistance: zod_1.z.number().positive().optional(), // meters
    entityTypes: zod_1.z.array(zod_1.z.string()).optional(),
    context: exports.policyContextSchema,
});
// =============================================================================
// RESULT TYPES
// =============================================================================
/**
 * Co-presence episode result
 */
exports.coPresenceEpisodeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    entityIds: zod_1.z.array(zod_1.z.string()),
    startTime: zod_1.z.number().int().nonnegative(),
    endTime: zod_1.z.number().int().nonnegative(),
    duration: zod_1.z.number().int().nonnegative(), // milliseconds
    centroid: exports.coordinateSchema,
    radius: zod_1.z.number().nonnegative(), // meters - actual computed radius
    confidence: zod_1.z.number().min(0).max(1),
    overlapCount: zod_1.z.number().int().positive(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
});
/**
 * Dwell detection result
 */
exports.dwellEpisodeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    entityId: zod_1.z.string(),
    areaId: zod_1.z.string().optional(),
    startTime: zod_1.z.number().int().nonnegative(),
    endTime: zod_1.z.number().int().nonnegative(),
    duration: zod_1.z.number().int().nonnegative(), // milliseconds
    centroid: exports.coordinateSchema,
    pointCount: zod_1.z.number().int().positive(),
    confidence: zod_1.z.number().min(0).max(1),
});
/**
 * Entity in region result
 */
exports.entityInRegionResultSchema = zod_1.z.object({
    entityId: zod_1.z.string(),
    firstSeen: zod_1.z.number().int().nonnegative(),
    lastSeen: zod_1.z.number().int().nonnegative(),
    observationCount: zod_1.z.number().int().positive(),
    centroid: exports.coordinateSchema.optional(),
    distance: zod_1.z.number().nonnegative().optional(), // from query center if applicable
});
/**
 * Spacetime summary for Analytics/Copilot
 */
exports.spacetimeSummarySchema = zod_1.z.object({
    entityId: zod_1.z.string(),
    timeRange: exports.timeWindowSchema,
    statistics: zod_1.z.object({
        totalObservations: zod_1.z.number().int().nonnegative(),
        uniqueLocations: zod_1.z.number().int().nonnegative(),
        totalDistance: zod_1.z.number().nonnegative(), // meters
        averageSpeed: zod_1.z.number().nonnegative().optional(), // m/s
        maxSpeed: zod_1.z.number().nonnegative().optional(), // m/s
        dwellCount: zod_1.z.number().int().nonnegative(),
        totalDwellTime: zod_1.z.number().int().nonnegative(), // ms
    }),
    boundingBox: zod_1.z.object({
        minLat: zod_1.z.number(),
        maxLat: zod_1.z.number(),
        minLon: zod_1.z.number(),
        maxLon: zod_1.z.number(),
    }).optional(),
    primaryLocations: zod_1.z.array(zod_1.z.object({
        coordinate: exports.coordinateSchema,
        visitCount: zod_1.z.number().int().positive(),
        totalDuration: zod_1.z.number().int().nonnegative(),
        label: zod_1.z.string().optional(),
    })).optional(),
    coPresencePartners: zod_1.z.array(zod_1.z.object({
        entityId: zod_1.z.string(),
        episodeCount: zod_1.z.number().int().positive(),
        totalDuration: zod_1.z.number().int().nonnegative(),
    })).optional(),
});
// =============================================================================
// CONFIGURATION
// =============================================================================
/**
 * Spacetime engine configuration
 */
exports.spacetimeConfigSchema = zod_1.z.object({
    maxQueryAreaSqMeters: zod_1.z.number().positive().default(exports.DEFAULT_MAX_QUERY_AREA_SQ_METERS),
    maxTimeSpanMs: zod_1.z.number().positive().default(exports.DEFAULT_MAX_TIME_SPAN_MS),
    maxResultCardinality: zod_1.z.number().int().positive().default(exports.DEFAULT_MAX_RESULT_CARDINALITY),
    maxEntitiesPerQuery: zod_1.z.number().int().positive().default(exports.DEFAULT_MAX_ENTITIES_PER_QUERY),
    geohashPrecision: zod_1.z.number().int().min(1).max(12).default(7),
    defaultConfidenceThreshold: zod_1.z.number().min(0).max(1).default(0.5),
    enableQueryLogging: zod_1.z.boolean().default(true),
    retentionPolicyDays: zod_1.z.number().int().positive().optional(),
});
// =============================================================================
// DERIVED EVENT TYPES (for Graph Core integration)
// =============================================================================
/**
 * Derived event reference for Graph Core ingestion
 */
exports.derivedEventReferenceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['co_presence', 'dwell', 'trajectory_segment', 'anomaly']),
    sourceEntityIds: zod_1.z.array(zod_1.z.string()),
    timeRange: exports.timeWindowSchema,
    location: exports.coordinateSchema.optional(),
    confidence: zod_1.z.number().min(0).max(1),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    tenantId: zod_1.z.string(),
    policyLabels: zod_1.z.array(zod_1.z.string()).default([]),
    generatedAt: zod_1.z.number().int().nonnegative(),
});
// =============================================================================
// UTILITY TYPE GUARDS
// =============================================================================
function isTimeEvent(obj) {
    return exports.timeEventSchema.safeParse(obj).success;
}
function isInterval(obj) {
    return exports.intervalSchema.safeParse(obj).success;
}
function isTrajectory(obj) {
    return exports.trajectorySchema.safeParse(obj).success;
}
function isGeoPoint(obj) {
    return exports.geoPointSchema.safeParse(obj).success;
}
function isGeoShape(obj) {
    return exports.geoShapeSchema.safeParse(obj).success;
}
