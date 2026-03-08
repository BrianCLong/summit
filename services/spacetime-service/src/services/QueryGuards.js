"use strict";
/**
 * Query Guards
 *
 * Enforces limits on query scope to prevent resource exhaustion.
 * Guards are applied before query execution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryGuardError = void 0;
exports.createGuards = createGuards;
exports.guardTimeWindow = guardTimeWindow;
exports.guardQueryArea = guardQueryArea;
exports.guardEntityCount = guardEntityCount;
exports.guardResultCardinality = guardResultCardinality;
exports.guardCoPresenceQuery = guardCoPresenceQuery;
exports.guardEntitiesInRegionQuery = guardEntitiesInRegionQuery;
exports.guardTrajectoryQuery = guardTrajectoryQuery;
exports.guardDwellQuery = guardDwellQuery;
exports.limitResults = limitResults;
exports.paginateResults = paginateResults;
const geo_js_1 = require("../utils/geo.js");
const time_js_1 = require("../utils/time.js");
/**
 * Query guard violation
 */
class QueryGuardError extends Error {
    guard;
    limit;
    actual;
    constructor(guard, limit, actual, message) {
        super(message);
        this.guard = guard;
        this.limit = limit;
        this.actual = actual;
        this.name = 'QueryGuardError';
    }
}
exports.QueryGuardError = QueryGuardError;
const DEFAULT_GUARDS = {
    maxQueryAreaSqMeters: 1_000_000_000_000, // ~1M km²
    maxTimeSpanMs: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxResultCardinality: 10_000,
    maxEntitiesPerQuery: 1000,
};
/**
 * Create guards from config
 */
function createGuards(config) {
    return {
        maxQueryAreaSqMeters: config?.maxQueryAreaSqMeters ?? DEFAULT_GUARDS.maxQueryAreaSqMeters,
        maxTimeSpanMs: config?.maxTimeSpanMs ?? DEFAULT_GUARDS.maxTimeSpanMs,
        maxResultCardinality: config?.maxResultCardinality ?? DEFAULT_GUARDS.maxResultCardinality,
        maxEntitiesPerQuery: config?.maxEntitiesPerQuery ?? DEFAULT_GUARDS.maxEntitiesPerQuery,
    };
}
/**
 * Validate time window against guards
 */
function guardTimeWindow(window, guards) {
    const span = window.end - window.start;
    if (span < 0) {
        throw new QueryGuardError('time_window_invalid', 'start <= end', `start=${window.start}, end=${window.end}`, 'Invalid time window: end must be >= start');
    }
    if (span > guards.maxTimeSpanMs) {
        throw new QueryGuardError('time_span_exceeded', (0, time_js_1.formatDuration)(guards.maxTimeSpanMs), (0, time_js_1.formatDuration)(span), `Time span ${(0, time_js_1.formatDuration)(span)} exceeds maximum ${(0, time_js_1.formatDuration)(guards.maxTimeSpanMs)}`);
    }
}
/**
 * Validate query area against guards
 */
function guardQueryArea(geometry, guards) {
    const area = (0, geo_js_1.calculateGeometryArea)(geometry);
    if (area > guards.maxQueryAreaSqMeters) {
        const areaKm2 = area / 1_000_000;
        const maxKm2 = guards.maxQueryAreaSqMeters / 1_000_000;
        throw new QueryGuardError('query_area_exceeded', `${maxKm2.toFixed(0)} km²`, `${areaKm2.toFixed(0)} km²`, `Query area ${areaKm2.toFixed(0)} km² exceeds maximum ${maxKm2.toFixed(0)} km²`);
    }
}
/**
 * Validate entity count against guards
 */
function guardEntityCount(entityIds, guards) {
    if (entityIds.length > guards.maxEntitiesPerQuery) {
        throw new QueryGuardError('entity_count_exceeded', guards.maxEntitiesPerQuery, entityIds.length, `Entity count ${entityIds.length} exceeds maximum ${guards.maxEntitiesPerQuery}`);
    }
}
/**
 * Validate result cardinality
 */
function guardResultCardinality(resultCount, guards) {
    if (resultCount > guards.maxResultCardinality) {
        throw new QueryGuardError('result_cardinality_exceeded', guards.maxResultCardinality, resultCount, `Result count ${resultCount} exceeds maximum ${guards.maxResultCardinality}. Use pagination.`);
    }
}
/**
 * Validate co-presence query
 */
function guardCoPresenceQuery(query, guards) {
    guardTimeWindow(query.timeWindow, guards);
    guardEntityCount(query.entityIds, guards);
    // Validate radius is reasonable
    if (query.radius > 100000) {
        throw new QueryGuardError('radius_exceeded', '100 km', `${(query.radius / 1000).toFixed(1)} km`, 'Co-presence radius exceeds maximum 100 km');
    }
    if (query.radius <= 0) {
        throw new QueryGuardError('radius_invalid', '> 0', query.radius.toString(), 'Radius must be positive');
    }
}
/**
 * Validate entities in region query
 */
function guardEntitiesInRegionQuery(query, guards) {
    guardQueryArea(query.shape, guards);
    if (query.timeRange) {
        guardTimeWindow(query.timeRange, guards);
    }
    if (query.limit > guards.maxResultCardinality) {
        throw new QueryGuardError('limit_exceeded', guards.maxResultCardinality, query.limit, `Requested limit ${query.limit} exceeds maximum ${guards.maxResultCardinality}`);
    }
}
/**
 * Validate trajectory query
 */
function guardTrajectoryQuery(query, guards) {
    guardTimeWindow(query.timeRange, guards);
}
/**
 * Validate dwell query
 */
function guardDwellQuery(query, guards) {
    guardQueryArea(query.area, guards);
    if (query.timeRange) {
        guardTimeWindow(query.timeRange, guards);
    }
    if (query.minDuration <= 0) {
        throw new QueryGuardError('min_duration_invalid', '> 0', query.minDuration.toString(), 'Minimum duration must be positive');
    }
    // Reasonable max dwell detection duration
    if (query.minDuration > 24 * 60 * 60 * 1000) {
        throw new QueryGuardError('min_duration_exceeded', '24 hours', (0, time_js_1.formatDuration)(query.minDuration), 'Minimum dwell duration exceeds 24 hours');
    }
}
/**
 * Limit results array to max cardinality
 */
function limitResults(results, guards) {
    if (results.length <= guards.maxResultCardinality) {
        return { results, truncated: false, originalCount: results.length };
    }
    return {
        results: results.slice(0, guards.maxResultCardinality),
        truncated: true,
        originalCount: results.length,
    };
}
/**
 * Create a paginated result with guard-aware limits
 */
function paginateResults(results, offset, limit, guards) {
    const effectiveLimit = Math.min(limit, guards.maxResultCardinality);
    const start = Math.max(0, offset);
    const items = results.slice(start, start + effectiveLimit);
    return {
        items,
        total: results.length,
        offset: start,
        limit: effectiveLimit,
        hasMore: start + items.length < results.length,
    };
}
