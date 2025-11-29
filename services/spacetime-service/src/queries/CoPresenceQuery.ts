/**
 * Co-Presence Query Implementation
 *
 * Finds episodes where multiple entities were at the same place at the same time.
 * Uses a sliding window approach with spatial clustering.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  CoPresenceQuery,
  CoPresenceEpisode,
  Coordinate,
  TimeWindow,
  PolicyContext,
} from '../types/index.js';
import type { SpacetimeIndex, SpacetimeEntry } from '../indexes/SpacetimeIndex.js';
import {
  haversineDistance,
  calculateCentroid,
} from '../utils/geo.js';
import {
  intervalsOverlap,
  overlapDuration,
  mergeIntervals,
} from '../utils/time.js';

/**
 * Internal representation of a co-presence candidate
 */
interface CoPresenceCandidate {
  entityIds: Set<string>;
  entries: SpacetimeEntry[];
  centroid: Coordinate;
  radius: number;
  timeRanges: Array<{ start: number; end: number }>;
}

/**
 * Configuration for co-presence detection
 */
export interface CoPresenceConfig {
  /** Time bucket size for initial grouping (ms) */
  timeBucketMs: number;
  /** Minimum confidence score (0-1) */
  minConfidence: number;
  /** Whether to merge adjacent episodes */
  mergeAdjacentEpisodes: boolean;
  /** Maximum gap between episodes to merge (ms) */
  mergeGapMs: number;
}

const DEFAULT_CONFIG: CoPresenceConfig = {
  timeBucketMs: 60000, // 1 minute
  minConfidence: 0.5,
  mergeAdjacentEpisodes: true,
  mergeGapMs: 300000, // 5 minutes
};

/**
 * Execute a co-presence query
 */
export function executeCoPresenceQuery(
  index: SpacetimeIndex,
  query: CoPresenceQuery,
  config: Partial<CoPresenceConfig> = {},
): CoPresenceEpisode[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Validate query
  if (query.entityIds.length < 2) {
    throw new Error('Co-presence query requires at least 2 entity IDs');
  }

  // Get all entries for requested entities in time window
  const entityEntries = new Map<string, SpacetimeEntry[]>();
  const entityIdSet = new Set(query.entityIds);

  for (const entityId of query.entityIds) {
    const entries = index.getEntityTimeline(entityId, query.timeWindow);

    // Filter by policy context
    const filtered = filterByPolicy(entries, query.context);

    if (filtered.length > 0) {
      entityEntries.set(entityId, filtered);
    }
  }

  // Need at least 2 entities with data
  if (entityEntries.size < 2) {
    return [];
  }

  // Find co-presence candidates using time bucketing
  const candidates = findCoPresenceCandidates(
    entityEntries,
    query.timeWindow,
    query.radius,
    cfg.timeBucketMs,
  );

  // Convert candidates to episodes
  let episodes = candidatesToEpisodes(
    candidates,
    query.minOverlapDuration,
    query.minConfidence,
  );

  // Merge adjacent episodes if configured
  if (cfg.mergeAdjacentEpisodes && episodes.length > 1) {
    episodes = mergeAdjacentEpisodes(episodes, cfg.mergeGapMs, query.radius);
  }

  // Sort by start time
  episodes.sort((a, b) => a.startTime - b.startTime);

  return episodes;
}

/**
 * Find co-presence candidates by bucketing time and checking spatial proximity
 */
function findCoPresenceCandidates(
  entityEntries: Map<string, SpacetimeEntry[]>,
  timeWindow: TimeWindow,
  radius: number,
  timeBucketMs: number,
): CoPresenceCandidate[] {
  const candidates: CoPresenceCandidate[] = [];

  // Create time buckets
  const bucketCount = Math.ceil(
    (timeWindow.end - timeWindow.start) / timeBucketMs,
  );

  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = timeWindow.start + i * timeBucketMs;
    const bucketEnd = Math.min(bucketStart + timeBucketMs, timeWindow.end);
    const bucket: TimeWindow = { start: bucketStart, end: bucketEnd };

    // Get entries in this bucket for each entity
    const bucketEntries = new Map<string, SpacetimeEntry[]>();

    for (const [entityId, entries] of entityEntries) {
      const inBucket = entries.filter((e) =>
        intervalsOverlap({ start: e.start, end: e.end }, bucket),
      );

      if (inBucket.length > 0) {
        bucketEntries.set(entityId, inBucket);
      }
    }

    // Need at least 2 entities in bucket
    if (bucketEntries.size < 2) {
      continue;
    }

    // Check spatial proximity between all entity pairs
    const candidate = checkSpatialProximity(bucketEntries, radius, bucket);

    if (candidate && candidate.entityIds.size >= 2) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

/**
 * Check if entities in a time bucket are spatially proximate
 */
function checkSpatialProximity(
  bucketEntries: Map<string, SpacetimeEntry[]>,
  radius: number,
  bucket: TimeWindow,
): CoPresenceCandidate | null {
  const allEntries: SpacetimeEntry[] = [];

  for (const entries of bucketEntries.values()) {
    allEntries.push(...entries);
  }

  if (allEntries.length < 2) {
    return null;
  }

  // Calculate centroid of all points
  const coordinates = allEntries.map((e) => e.coordinate);
  const centroid = calculateCentroid(coordinates);

  // Find entries within radius of centroid
  const withinRadius: SpacetimeEntry[] = [];
  let maxDistance = 0;

  for (const entry of allEntries) {
    const distance = haversineDistance(centroid, entry.coordinate);
    if (distance <= radius) {
      withinRadius.push(entry);
      maxDistance = Math.max(maxDistance, distance);
    }
  }

  // Get unique entity IDs within radius
  const entityIds = new Set(withinRadius.map((e) => e.entityId));

  if (entityIds.size < 2) {
    return null;
  }

  // Calculate time ranges for each entity
  const timeRanges: Array<{ start: number; end: number }> = [];

  for (const entry of withinRadius) {
    timeRanges.push({
      start: Math.max(entry.start, bucket.start),
      end: Math.min(entry.end, bucket.end),
    });
  }

  return {
    entityIds,
    entries: withinRadius,
    centroid,
    radius: maxDistance,
    timeRanges,
  };
}

/**
 * Convert candidates to co-presence episodes
 */
function candidatesToEpisodes(
  candidates: CoPresenceCandidate[],
  minOverlapDuration: number,
  minConfidence: number,
): CoPresenceEpisode[] {
  const episodes: CoPresenceEpisode[] = [];

  for (const candidate of candidates) {
    // Calculate overlap duration
    const mergedRanges = mergeIntervals(candidate.timeRanges);
    const totalDuration = mergedRanges.reduce(
      (sum, r) => sum + (r.end - r.start),
      0,
    );

    if (totalDuration < minOverlapDuration) {
      continue;
    }

    // Calculate confidence based on:
    // - Number of observations per entity
    // - Spatial spread (tighter = higher confidence)
    // - Temporal density
    const entriesPerEntity = new Map<string, number>();

    for (const entry of candidate.entries) {
      entriesPerEntity.set(
        entry.entityId,
        (entriesPerEntity.get(entry.entityId) || 0) + 1,
      );
    }

    const minEntriesPerEntity = Math.min(...entriesPerEntity.values());
    const observationScore = Math.min(1, minEntriesPerEntity / 3); // 3+ observations = full score

    const spatialScore = 1 - candidate.radius / 1000; // Penalty for spread > 1km
    const normalizedSpatialScore = Math.max(0, Math.min(1, spatialScore));

    const confidence =
      0.5 * observationScore + 0.5 * normalizedSpatialScore;

    if (confidence < minConfidence) {
      continue;
    }

    // Determine time bounds
    let startTime = Infinity;
    let endTime = -Infinity;

    for (const range of mergedRanges) {
      startTime = Math.min(startTime, range.start);
      endTime = Math.max(endTime, range.end);
    }

    episodes.push({
      id: uuidv4(),
      entityIds: Array.from(candidate.entityIds),
      startTime,
      endTime,
      duration: totalDuration,
      centroid: candidate.centroid,
      radius: candidate.radius,
      confidence,
      overlapCount: candidate.entries.length,
      metadata: {
        entriesPerEntity: Object.fromEntries(entriesPerEntity),
        mergedRangeCount: mergedRanges.length,
      },
    });
  }

  return episodes;
}

/**
 * Merge adjacent episodes that are close in time and space
 */
function mergeAdjacentEpisodes(
  episodes: CoPresenceEpisode[],
  maxGapMs: number,
  maxRadius: number,
): CoPresenceEpisode[] {
  if (episodes.length <= 1) {
    return episodes;
  }

  // Sort by start time
  const sorted = [...episodes].sort((a, b) => a.startTime - b.startTime);
  const merged: CoPresenceEpisode[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // Check if should merge
    const timeGap = current.startTime - last.endTime;
    const spatialDistance = haversineDistance(last.centroid, current.centroid);
    const sameEntities =
      current.entityIds.length === last.entityIds.length &&
      current.entityIds.every((id) => last.entityIds.includes(id));

    if (
      sameEntities &&
      timeGap <= maxGapMs &&
      spatialDistance <= maxRadius
    ) {
      // Merge into last
      last.endTime = current.endTime;
      last.duration = last.endTime - last.startTime;
      last.overlapCount += current.overlapCount;
      last.confidence = (last.confidence + current.confidence) / 2;

      // Recalculate centroid
      last.centroid = calculateCentroid([last.centroid, current.centroid]);
      last.radius = Math.max(last.radius, current.radius, spatialDistance / 2);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Filter entries by policy context
 */
function filterByPolicy(
  entries: SpacetimeEntry[],
  context: PolicyContext,
): SpacetimeEntry[] {
  return entries.filter((entry) => {
    // Must match tenant
    if (entry.tenantId !== context.tenantId) {
      return false;
    }

    // Check policy labels (entry must have all required labels)
    if (context.policyLabels.length > 0) {
      const entryLabels = new Set(entry.policyLabels);
      return context.policyLabels.every((label) => entryLabels.has(label));
    }

    return true;
  });
}

/**
 * Calculate statistics for co-presence results
 */
export function calculateCoPresenceStats(episodes: CoPresenceEpisode[]): {
  totalEpisodes: number;
  totalDuration: number;
  averageDuration: number;
  uniqueEntityPairs: number;
  averageConfidence: number;
} {
  if (episodes.length === 0) {
    return {
      totalEpisodes: 0,
      totalDuration: 0,
      averageDuration: 0,
      uniqueEntityPairs: 0,
      averageConfidence: 0,
    };
  }

  const totalDuration = episodes.reduce((sum, e) => sum + e.duration, 0);
  const avgConfidence =
    episodes.reduce((sum, e) => sum + e.confidence, 0) / episodes.length;

  // Count unique entity pairs
  const pairs = new Set<string>();

  for (const episode of episodes) {
    const sortedIds = [...episode.entityIds].sort();
    for (let i = 0; i < sortedIds.length; i++) {
      for (let j = i + 1; j < sortedIds.length; j++) {
        pairs.add(`${sortedIds[i]}:${sortedIds[j]}`);
      }
    }
  }

  return {
    totalEpisodes: episodes.length,
    totalDuration,
    averageDuration: totalDuration / episodes.length,
    uniqueEntityPairs: pairs.size,
    averageConfidence: avgConfidence,
  };
}
