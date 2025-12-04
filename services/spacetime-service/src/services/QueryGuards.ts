/**
 * Query Guards
 *
 * Enforces limits on query scope to prevent resource exhaustion.
 * Guards are applied before query execution.
 */

import type {
  SpacetimeConfig,
  TimeWindow,
  GeoJsonGeometry,
  CoPresenceQuery,
  EntitiesInRegionQuery,
  TrajectoryQuery,
  DwellQuery,
  DEFAULT_MAX_QUERY_AREA_SQ_METERS,
  DEFAULT_MAX_TIME_SPAN_MS,
  DEFAULT_MAX_RESULT_CARDINALITY,
  DEFAULT_MAX_ENTITIES_PER_QUERY,
} from '../types/index.js';
import { calculateGeometryArea, geometryBoundingBox } from '../utils/geo.js';
import { formatDuration } from '../utils/time.js';

/**
 * Query guard violation
 */
export class QueryGuardError extends Error {
  constructor(
    public readonly guard: string,
    public readonly limit: number | string,
    public readonly actual: number | string,
    message: string,
  ) {
    super(message);
    this.name = 'QueryGuardError';
  }
}

/**
 * Guard configuration
 */
export interface QueryGuardConfig {
  maxQueryAreaSqMeters: number;
  maxTimeSpanMs: number;
  maxResultCardinality: number;
  maxEntitiesPerQuery: number;
}

const DEFAULT_GUARDS: QueryGuardConfig = {
  maxQueryAreaSqMeters: 1_000_000_000_000, // ~1M km²
  maxTimeSpanMs: 365 * 24 * 60 * 60 * 1000, // 1 year
  maxResultCardinality: 10_000,
  maxEntitiesPerQuery: 1000,
};

/**
 * Create guards from config
 */
export function createGuards(config?: Partial<SpacetimeConfig>): QueryGuardConfig {
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
export function guardTimeWindow(
  window: TimeWindow,
  guards: QueryGuardConfig,
): void {
  const span = window.end - window.start;

  if (span < 0) {
    throw new QueryGuardError(
      'time_window_invalid',
      'start <= end',
      `start=${window.start}, end=${window.end}`,
      'Invalid time window: end must be >= start',
    );
  }

  if (span > guards.maxTimeSpanMs) {
    throw new QueryGuardError(
      'time_span_exceeded',
      formatDuration(guards.maxTimeSpanMs),
      formatDuration(span),
      `Time span ${formatDuration(span)} exceeds maximum ${formatDuration(guards.maxTimeSpanMs)}`,
    );
  }
}

/**
 * Validate query area against guards
 */
export function guardQueryArea(
  geometry: GeoJsonGeometry,
  guards: QueryGuardConfig,
): void {
  const area = calculateGeometryArea(geometry);

  if (area > guards.maxQueryAreaSqMeters) {
    const areaKm2 = area / 1_000_000;
    const maxKm2 = guards.maxQueryAreaSqMeters / 1_000_000;

    throw new QueryGuardError(
      'query_area_exceeded',
      `${maxKm2.toFixed(0)} km²`,
      `${areaKm2.toFixed(0)} km²`,
      `Query area ${areaKm2.toFixed(0)} km² exceeds maximum ${maxKm2.toFixed(0)} km²`,
    );
  }
}

/**
 * Validate entity count against guards
 */
export function guardEntityCount(
  entityIds: string[],
  guards: QueryGuardConfig,
): void {
  if (entityIds.length > guards.maxEntitiesPerQuery) {
    throw new QueryGuardError(
      'entity_count_exceeded',
      guards.maxEntitiesPerQuery,
      entityIds.length,
      `Entity count ${entityIds.length} exceeds maximum ${guards.maxEntitiesPerQuery}`,
    );
  }
}

/**
 * Validate result cardinality
 */
export function guardResultCardinality(
  resultCount: number,
  guards: QueryGuardConfig,
): void {
  if (resultCount > guards.maxResultCardinality) {
    throw new QueryGuardError(
      'result_cardinality_exceeded',
      guards.maxResultCardinality,
      resultCount,
      `Result count ${resultCount} exceeds maximum ${guards.maxResultCardinality}. Use pagination.`,
    );
  }
}

/**
 * Validate co-presence query
 */
export function guardCoPresenceQuery(
  query: CoPresenceQuery,
  guards: QueryGuardConfig,
): void {
  guardTimeWindow(query.timeWindow, guards);
  guardEntityCount(query.entityIds, guards);

  // Validate radius is reasonable
  if (query.radius > 100000) {
    throw new QueryGuardError(
      'radius_exceeded',
      '100 km',
      `${(query.radius / 1000).toFixed(1)} km`,
      'Co-presence radius exceeds maximum 100 km',
    );
  }

  if (query.radius <= 0) {
    throw new QueryGuardError(
      'radius_invalid',
      '> 0',
      query.radius.toString(),
      'Radius must be positive',
    );
  }
}

/**
 * Validate entities in region query
 */
export function guardEntitiesInRegionQuery(
  query: EntitiesInRegionQuery,
  guards: QueryGuardConfig,
): void {
  guardQueryArea(query.shape, guards);

  if (query.timeRange) {
    guardTimeWindow(query.timeRange, guards);
  }

  if (query.limit > guards.maxResultCardinality) {
    throw new QueryGuardError(
      'limit_exceeded',
      guards.maxResultCardinality,
      query.limit,
      `Requested limit ${query.limit} exceeds maximum ${guards.maxResultCardinality}`,
    );
  }
}

/**
 * Validate trajectory query
 */
export function guardTrajectoryQuery(
  query: TrajectoryQuery,
  guards: QueryGuardConfig,
): void {
  guardTimeWindow(query.timeRange, guards);
}

/**
 * Validate dwell query
 */
export function guardDwellQuery(
  query: DwellQuery,
  guards: QueryGuardConfig,
): void {
  guardQueryArea(query.area, guards);

  if (query.timeRange) {
    guardTimeWindow(query.timeRange, guards);
  }

  if (query.minDuration <= 0) {
    throw new QueryGuardError(
      'min_duration_invalid',
      '> 0',
      query.minDuration.toString(),
      'Minimum duration must be positive',
    );
  }

  // Reasonable max dwell detection duration
  if (query.minDuration > 24 * 60 * 60 * 1000) {
    throw new QueryGuardError(
      'min_duration_exceeded',
      '24 hours',
      formatDuration(query.minDuration),
      'Minimum dwell duration exceeds 24 hours',
    );
  }
}

/**
 * Limit results array to max cardinality
 */
export function limitResults<T>(
  results: T[],
  guards: QueryGuardConfig,
): { results: T[]; truncated: boolean; originalCount: number } {
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
export function paginateResults<T>(
  results: T[],
  offset: number,
  limit: number,
  guards: QueryGuardConfig,
): {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
} {
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
