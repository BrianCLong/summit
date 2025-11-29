/**
 * Dwell Detection Query Implementation
 *
 * Detects periods where an entity remained stationary within a defined area
 * for a minimum duration. Useful for identifying stops, meetings, or loitering.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  DwellQuery,
  DwellEpisode,
  Coordinate,
  PolicyContext,
} from '../types/index.js';
import type { SpacetimeIndex, SpacetimeEntry } from '../indexes/SpacetimeIndex.js';
import {
  pointInGeometry,
  haversineDistance,
  calculateCentroid,
  geometryBoundingBox,
} from '../utils/geo.js';
import { findSequences, mergeIntervals } from '../utils/time.js';

/**
 * Configuration for dwell detection
 */
export interface DwellConfig {
  /** Maximum movement within area to still consider dwelling (meters) */
  maxMovementRadius: number;
  /** Minimum observations to consider a valid dwell */
  minObservations: number;
  /** Whether to merge adjacent dwell episodes */
  mergeAdjacent: boolean;
}

const DEFAULT_CONFIG: DwellConfig = {
  maxMovementRadius: 50, // 50 meters
  minObservations: 2,
  mergeAdjacent: true,
};

/**
 * Execute a dwell detection query
 */
export function executeDwellQuery(
  index: SpacetimeIndex,
  query: DwellQuery,
  config: Partial<DwellConfig> = {},
): DwellEpisode[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Get entity timeline
  const timeRange = query.timeRange ?? index.getTimeBounds() ?? { start: 0, end: Date.now() };
  let entries = index.getEntityTimeline(query.entityId, timeRange);

  // Filter by policy context
  entries = filterByPolicy(entries, query.context);

  if (entries.length < cfg.minObservations) {
    return [];
  }

  // Filter to entries within the area
  const bbox = geometryBoundingBox(query.area);
  const inArea = entries.filter((entry) => {
    // Quick bbox check first
    if (
      entry.coordinate.latitude < bbox.minLat ||
      entry.coordinate.latitude > bbox.maxLat ||
      entry.coordinate.longitude < bbox.minLon ||
      entry.coordinate.longitude > bbox.maxLon
    ) {
      return false;
    }

    // Then precise geometry check
    return pointInGeometry(entry.coordinate, query.area);
  });

  if (inArea.length < cfg.minObservations) {
    return [];
  }

  // Find dwell sequences (continuous presence in area)
  const sequences = findDwellSequences(
    inArea,
    query.maxGapDuration,
    cfg.maxMovementRadius,
  );

  // Convert sequences to dwell episodes
  let episodes = sequencesToEpisodes(
    sequences,
    query.entityId,
    query.minDuration,
    cfg.minObservations,
  );

  // Merge adjacent episodes if configured
  if (cfg.mergeAdjacent && episodes.length > 1) {
    episodes = mergeAdjacentDwellEpisodes(episodes, query.maxGapDuration);
  }

  // Sort by start time
  episodes.sort((a, b) => a.startTime - b.startTime);

  return episodes;
}

/**
 * Detect all dwell episodes for an entity (without a specific area)
 * Uses clustering to find natural stopping points
 */
export function detectAllDwellEpisodes(
  index: SpacetimeIndex,
  entityId: string,
  minDuration: number,
  context: PolicyContext,
  config: Partial<DwellConfig> = {},
): DwellEpisode[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Get full entity timeline
  let entries = index.getEntityTimeline(entityId);

  // Filter by policy
  entries = filterByPolicy(entries, context);

  if (entries.length < cfg.minObservations) {
    return [];
  }

  // Find stationary clusters using temporal proximity and spatial density
  const clusters = findStationaryClusters(
    entries,
    cfg.maxMovementRadius,
    cfg.minObservations,
  );

  const episodes: DwellEpisode[] = [];

  for (const cluster of clusters) {
    const duration = cluster.endTime - cluster.startTime;

    if (duration >= minDuration) {
      episodes.push({
        id: uuidv4(),
        entityId,
        startTime: cluster.startTime,
        endTime: cluster.endTime,
        duration,
        centroid: cluster.centroid,
        pointCount: cluster.entries.length,
        confidence: calculateDwellConfidence(cluster.entries, cluster.centroid, cfg.maxMovementRadius),
      });
    }
  }

  return episodes;
}

/**
 * Calculate dwell statistics for an entity
 */
export function calculateDwellStats(
  episodes: DwellEpisode[],
): {
  totalDwellTime: number;
  averageDwellDuration: number;
  dwellCount: number;
  longestDwell: number;
  shortestDwell: number;
  uniqueLocations: number;
} {
  if (episodes.length === 0) {
    return {
      totalDwellTime: 0,
      averageDwellDuration: 0,
      dwellCount: 0,
      longestDwell: 0,
      shortestDwell: 0,
      uniqueLocations: 0,
    };
  }

  const totalDwellTime = episodes.reduce((sum, e) => sum + e.duration, 0);
  const durations = episodes.map((e) => e.duration);

  // Count unique locations (cluster centroids within 100m)
  const uniqueLocations = countUniqueLocations(episodes.map((e) => e.centroid), 100);

  return {
    totalDwellTime,
    averageDwellDuration: totalDwellTime / episodes.length,
    dwellCount: episodes.length,
    longestDwell: Math.max(...durations),
    shortestDwell: Math.min(...durations),
    uniqueLocations,
  };
}

/**
 * Find sequences of entries that represent dwelling
 */
function findDwellSequences(
  entries: SpacetimeEntry[],
  maxGapMs: number,
  maxMovementRadius: number,
): SpacetimeEntry[][] {
  if (entries.length === 0) {
    return [];
  }

  // First split by time gaps
  const timeSequences = findSequences(entries, maxGapMs);
  const dwellSequences: SpacetimeEntry[][] = [];

  for (const sequence of timeSequences) {
    // Then check if movement is within threshold
    if (sequence.length === 1) {
      dwellSequences.push(sequence);
      continue;
    }

    const centroid = calculateCentroid(sequence.map((e) => e.coordinate));
    const allWithinRadius = sequence.every(
      (e) => haversineDistance(centroid, e.coordinate) <= maxMovementRadius,
    );

    if (allWithinRadius) {
      dwellSequences.push(sequence);
    } else {
      // Split by movement - find sub-sequences that are stationary
      const subSequences = splitByMovement(sequence, maxMovementRadius);
      dwellSequences.push(...subSequences);
    }
  }

  return dwellSequences;
}

/**
 * Split a sequence by excessive movement
 */
function splitByMovement(
  entries: SpacetimeEntry[],
  maxRadius: number,
): SpacetimeEntry[][] {
  if (entries.length <= 1) {
    return entries.length === 1 ? [[entries[0]]] : [];
  }

  const sequences: SpacetimeEntry[][] = [];
  let currentSequence: SpacetimeEntry[] = [entries[0]];
  let currentCentroid = entries[0].coordinate;

  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i];
    const distance = haversineDistance(currentCentroid, entry.coordinate);

    if (distance <= maxRadius) {
      currentSequence.push(entry);
      // Update centroid
      currentCentroid = calculateCentroid(currentSequence.map((e) => e.coordinate));
    } else {
      // Start new sequence
      if (currentSequence.length > 0) {
        sequences.push(currentSequence);
      }
      currentSequence = [entry];
      currentCentroid = entry.coordinate;
    }
  }

  if (currentSequence.length > 0) {
    sequences.push(currentSequence);
  }

  return sequences;
}

/**
 * Find stationary clusters in a timeline
 */
function findStationaryClusters(
  entries: SpacetimeEntry[],
  maxRadius: number,
  minPoints: number,
): Array<{
  entries: SpacetimeEntry[];
  centroid: Coordinate;
  startTime: number;
  endTime: number;
}> {
  const clusters: Array<{
    entries: SpacetimeEntry[];
    centroid: Coordinate;
    startTime: number;
    endTime: number;
  }> = [];

  let i = 0;
  while (i < entries.length) {
    const clusterEntries: SpacetimeEntry[] = [entries[i]];
    let centroid = entries[i].coordinate;
    let j = i + 1;

    while (j < entries.length) {
      const candidate = entries[j];
      const distance = haversineDistance(centroid, candidate.coordinate);

      if (distance <= maxRadius) {
        clusterEntries.push(candidate);
        centroid = calculateCentroid(clusterEntries.map((e) => e.coordinate));
        j++;
      } else {
        break;
      }
    }

    if (clusterEntries.length >= minPoints) {
      clusters.push({
        entries: clusterEntries,
        centroid,
        startTime: clusterEntries[0].start,
        endTime: clusterEntries[clusterEntries.length - 1].end,
      });
    }

    i = j;
  }

  return clusters;
}

/**
 * Convert dwell sequences to episodes
 */
function sequencesToEpisodes(
  sequences: SpacetimeEntry[][],
  entityId: string,
  minDuration: number,
  minObservations: number,
): DwellEpisode[] {
  const episodes: DwellEpisode[] = [];

  for (const sequence of sequences) {
    if (sequence.length < minObservations) {
      continue;
    }

    const startTime = sequence[0].start;
    const endTime = sequence[sequence.length - 1].end;
    const duration = endTime - startTime;

    if (duration < minDuration) {
      continue;
    }

    const centroid = calculateCentroid(sequence.map((e) => e.coordinate));

    episodes.push({
      id: uuidv4(),
      entityId,
      startTime,
      endTime,
      duration,
      centroid,
      pointCount: sequence.length,
      confidence: calculateDwellConfidence(sequence, centroid, 50),
    });
  }

  return episodes;
}

/**
 * Merge adjacent dwell episodes at the same location
 */
function mergeAdjacentDwellEpisodes(
  episodes: DwellEpisode[],
  maxGapMs: number,
): DwellEpisode[] {
  if (episodes.length <= 1) {
    return episodes;
  }

  const sorted = [...episodes].sort((a, b) => a.startTime - b.startTime);
  const merged: DwellEpisode[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    const timeGap = current.startTime - last.endTime;
    const spatialDistance = haversineDistance(last.centroid, current.centroid);

    // Merge if close in time and space
    if (timeGap <= maxGapMs && spatialDistance <= 100) {
      last.endTime = current.endTime;
      last.duration = last.endTime - last.startTime;
      last.pointCount += current.pointCount;
      last.centroid = calculateCentroid([last.centroid, current.centroid]);
      last.confidence = (last.confidence + current.confidence) / 2;
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Calculate confidence score for a dwell episode
 */
function calculateDwellConfidence(
  entries: SpacetimeEntry[],
  centroid: Coordinate,
  maxRadius: number,
): number {
  if (entries.length === 0) {
    return 0;
  }

  // Calculate spatial spread
  let totalDistance = 0;
  for (const entry of entries) {
    totalDistance += haversineDistance(centroid, entry.coordinate);
  }
  const avgDistance = totalDistance / entries.length;
  const spatialScore = Math.max(0, 1 - avgDistance / maxRadius);

  // Calculate temporal density
  const duration = entries[entries.length - 1].end - entries[0].start;
  const pointsPerMinute = duration > 0 ? (entries.length * 60000) / duration : 0;
  const temporalScore = Math.min(1, pointsPerMinute / 2); // 2 points/min = full score

  // Observation count score
  const countScore = Math.min(1, entries.length / 5); // 5+ observations = full score

  return 0.4 * spatialScore + 0.3 * temporalScore + 0.3 * countScore;
}

/**
 * Count unique locations within a radius
 */
function countUniqueLocations(
  coordinates: Coordinate[],
  radiusMeters: number,
): number {
  if (coordinates.length === 0) {
    return 0;
  }

  const unique: Coordinate[] = [];

  for (const coord of coordinates) {
    const isNearExisting = unique.some(
      (u) => haversineDistance(u, coord) <= radiusMeters,
    );

    if (!isNearExisting) {
      unique.push(coord);
    }
  }

  return unique.length;
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
