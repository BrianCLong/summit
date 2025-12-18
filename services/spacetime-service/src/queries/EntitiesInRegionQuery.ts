/**
 * Entities In Region Query Implementation
 *
 * Finds entities that were present within a specified geographic region
 * during a given time range.
 */

import type {
  EntitiesInRegionQuery,
  EntityInRegionResult,
  Coordinate,
  PolicyContext,
} from '../types/index.js';
import type { SpacetimeIndex, SpacetimeEntry } from '../indexes/SpacetimeIndex.js';
import {
  pointInGeometry,
  calculateCentroid,
  haversineDistance,
  geometryBoundingBox,
} from '../utils/geo.js';
import { intervalsOverlap } from '../utils/time.js';

/**
 * Configuration for entities in region query
 */
export interface EntitiesInRegionConfig {
  /** Whether to calculate centroid for each entity */
  calculateCentroid: boolean;
  /** Whether to include observation count */
  includeObservationCount: boolean;
  /** Sort order for results */
  sortBy: 'firstSeen' | 'lastSeen' | 'observationCount';
  /** Sort direction */
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_CONFIG: EntitiesInRegionConfig = {
  calculateCentroid: true,
  includeObservationCount: true,
  sortBy: 'firstSeen',
  sortOrder: 'asc',
};

/**
 * Execute an entities in region query
 */
export function executeEntitiesInRegionQuery(
  index: SpacetimeIndex,
  query: EntitiesInRegionQuery,
  config: Partial<EntitiesInRegionConfig> = {},
): EntityInRegionResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Get bounding box of geometry for initial filter
  const bbox = geometryBoundingBox(query.shape);

  // Query spatial index
  let entries = index.query({
    bbox: {
      minLat: bbox.minLat,
      maxLat: bbox.maxLat,
      minLon: bbox.minLon,
      maxLon: bbox.maxLon,
    },
    timeWindow: query.timeRange,
    limit: undefined, // Get all, we'll limit after grouping
  });

  // Filter by exact geometry (point-in-polygon)
  entries = entries.filter((entry) =>
    pointInGeometry(entry.coordinate, query.shape),
  );

  // Filter by policy context
  entries = filterByPolicy(entries, query.context);

  // Filter by entity types if specified
  if (query.entityTypes && query.entityTypes.length > 0) {
    const typeSet = new Set(query.entityTypes);
    entries = entries.filter((entry) => {
      const entityType = entry.attributes.entityType as string | undefined;
      return entityType && typeSet.has(entityType);
    });
  }

  // Group by entity
  const entityGroups = new Map<string, SpacetimeEntry[]>();

  for (const entry of entries) {
    if (!entityGroups.has(entry.entityId)) {
      entityGroups.set(entry.entityId, []);
    }
    entityGroups.get(entry.entityId)!.push(entry);
  }

  // Convert to results
  const results: EntityInRegionResult[] = [];

  for (const [entityId, entityEntries] of entityGroups) {
    // Calculate time bounds
    let firstSeen = Infinity;
    let lastSeen = -Infinity;

    for (const entry of entityEntries) {
      firstSeen = Math.min(firstSeen, entry.start);
      lastSeen = Math.max(lastSeen, entry.end);
    }

    const result: EntityInRegionResult = {
      entityId,
      firstSeen,
      lastSeen,
      observationCount: entityEntries.length,
    };

    // Calculate centroid if configured
    if (cfg.calculateCentroid && entityEntries.length > 0) {
      result.centroid = calculateCentroid(
        entityEntries.map((e) => e.coordinate),
      );
    }

    results.push(result);
  }

  // Sort results
  sortResults(results, cfg.sortBy, cfg.sortOrder);

  // Apply offset and limit
  let finalResults = results;

  if (query.offset > 0) {
    finalResults = finalResults.slice(query.offset);
  }

  if (finalResults.length > query.limit) {
    finalResults = finalResults.slice(0, query.limit);
  }

  return finalResults;
}

/**
 * Count unique entities in a region (faster than full query)
 */
export function countEntitiesInRegion(
  index: SpacetimeIndex,
  query: EntitiesInRegionQuery,
): number {
  const bbox = geometryBoundingBox(query.shape);

  let entries = index.query({
    bbox: {
      minLat: bbox.minLat,
      maxLat: bbox.maxLat,
      minLon: bbox.minLon,
      maxLon: bbox.maxLon,
    },
    timeWindow: query.timeRange,
  });

  // Filter by exact geometry
  entries = entries.filter((entry) =>
    pointInGeometry(entry.coordinate, query.shape),
  );

  // Filter by policy
  entries = filterByPolicy(entries, query.context);

  // Count unique entities
  const uniqueEntities = new Set(entries.map((e) => e.entityId));

  return uniqueEntities.size;
}

/**
 * Get entity presence timeline in a region
 */
export function getEntityPresenceTimeline(
  index: SpacetimeIndex,
  entityId: string,
  query: EntitiesInRegionQuery,
): Array<{ start: number; end: number; coordinate: Coordinate }> {
  const bbox = geometryBoundingBox(query.shape);

  let entries = index.query({
    bbox: {
      minLat: bbox.minLat,
      maxLat: bbox.maxLat,
      minLon: bbox.minLon,
      maxLon: bbox.maxLon,
    },
    timeWindow: query.timeRange,
    entityIds: [entityId],
  });

  // Filter by exact geometry
  entries = entries.filter((entry) =>
    pointInGeometry(entry.coordinate, query.shape),
  );

  // Filter by policy
  entries = filterByPolicy(entries, query.context);

  // Sort by time
  entries.sort((a, b) => a.start - b.start);

  return entries.map((e) => ({
    start: e.start,
    end: e.end,
    coordinate: e.coordinate,
  }));
}

/**
 * Find entities that entered/exited the region during time range
 */
export function findRegionTransitions(
  index: SpacetimeIndex,
  query: EntitiesInRegionQuery,
): Array<{
  entityId: string;
  type: 'entry' | 'exit';
  timestamp: number;
  coordinate: Coordinate;
}> {
  if (!query.timeRange) {
    return [];
  }

  const transitions: Array<{
    entityId: string;
    type: 'entry' | 'exit';
    timestamp: number;
    coordinate: Coordinate;
  }> = [];

  // Get all entity IDs in the region during time range
  const results = executeEntitiesInRegionQuery(index, query);
  const entityIds = results.map((r) => r.entityId);

  for (const entityId of entityIds) {
    // Get full timeline for entity (before, during, and after)
    const extendedWindow = {
      start: query.timeRange.start - 3600000, // 1 hour before
      end: query.timeRange.end + 3600000, // 1 hour after
    };

    const timeline = index.getEntityTimeline(entityId, extendedWindow);

    // Filter by policy
    const filtered = filterByPolicy(timeline, query.context);

    // Check each point for entry/exit
    let wasInside = false;

    for (const entry of filtered) {
      const isInside = pointInGeometry(entry.coordinate, query.shape);

      if (!wasInside && isInside) {
        // Entry
        if (entry.start >= query.timeRange.start && entry.start <= query.timeRange.end) {
          transitions.push({
            entityId,
            type: 'entry',
            timestamp: entry.start,
            coordinate: entry.coordinate,
          });
        }
      } else if (wasInside && !isInside) {
        // Exit
        if (entry.start >= query.timeRange.start && entry.start <= query.timeRange.end) {
          transitions.push({
            entityId,
            type: 'exit',
            timestamp: entry.start,
            coordinate: entry.coordinate,
          });
        }
      }

      wasInside = isInside;
    }
  }

  // Sort by timestamp
  transitions.sort((a, b) => a.timestamp - b.timestamp);

  return transitions;
}

/**
 * Filter entries by policy context
 */
function filterByPolicy(
  entries: SpacetimeEntry[],
  context: PolicyContext,
): SpacetimeEntry[] {
  return entries.filter((entry) => {
    if (entry.tenantId !== context.tenantId) {
      return false;
    }

    if (context.policyLabels.length > 0) {
      const entryLabels = new Set(entry.policyLabels);
      return context.policyLabels.every((label) => entryLabels.has(label));
    }

    return true;
  });
}

/**
 * Sort results by specified field
 */
function sortResults(
  results: EntityInRegionResult[],
  sortBy: EntitiesInRegionConfig['sortBy'],
  sortOrder: EntitiesInRegionConfig['sortOrder'],
): void {
  const multiplier = sortOrder === 'asc' ? 1 : -1;

  results.sort((a, b) => {
    switch (sortBy) {
      case 'firstSeen':
        return (a.firstSeen - b.firstSeen) * multiplier;
      case 'lastSeen':
        return (a.lastSeen - b.lastSeen) * multiplier;
      case 'observationCount':
        return (a.observationCount - b.observationCount) * multiplier;
      default:
        return 0;
    }
  });
}
