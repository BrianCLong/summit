/**
 * Trajectory Query Implementation
 *
 * Reconstructs movement trajectories for entities from point observations.
 * Supports simplification, speed/heading calculation, and segmentation.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  TrajectoryQuery,
  Trajectory,
  TrajectoryPoint,
  Coordinate,
  PolicyContext,
} from '../types/index.js';
import type { SpacetimeIndex, SpacetimeEntry } from '../indexes/SpacetimeIndex.js';
import {
  haversineDistance,
  calculateBearing,
  calculatePathDistance,
  simplifyPath,
  calculateBoundingBox,
} from '../utils/geo.js';
import { findSequences } from '../utils/time.js';

/**
 * Configuration for trajectory reconstruction
 */
export interface TrajectoryConfig {
  /** Maximum gap between points to consider continuous (ms) */
  maxGapMs: number;
  /** Minimum points to form a trajectory */
  minPoints: number;
  /** Maximum speed to consider valid (m/s) - filters outliers */
  maxSpeedMs: number;
  /** Whether to interpolate missing points */
  interpolate: boolean;
  /** Interpolation interval (ms) */
  interpolationIntervalMs: number;
}

const DEFAULT_CONFIG: TrajectoryConfig = {
  maxGapMs: 300000, // 5 minutes
  minPoints: 2,
  maxSpeedMs: 100, // ~360 km/h
  interpolate: false,
  interpolationIntervalMs: 60000, // 1 minute
};

/**
 * Execute a trajectory query
 */
export function executeTrajectoryQuery(
  index: SpacetimeIndex,
  query: TrajectoryQuery,
  config: Partial<TrajectoryConfig> = {},
): Trajectory | null {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Get all entries for entity in time range
  let entries = index.getEntityTimeline(query.entityId, query.timeRange);

  // Filter by policy context
  entries = filterByPolicy(entries, query.context);

  if (entries.length < cfg.minPoints) {
    return null;
  }

  // Convert to trajectory points
  let points = entriesToPoints(entries, query.includeSpeed, query.includeHeading);

  // Filter out speed outliers
  points = filterSpeedOutliers(points, cfg.maxSpeedMs);

  if (points.length < cfg.minPoints) {
    return null;
  }

  // Simplify if tolerance specified
  if (query.simplifyTolerance !== undefined && query.simplifyTolerance > 0) {
    const simplified = simplifyTrajectory(points, query.simplifyTolerance);
    points = simplified;
  }

  // Calculate trajectory statistics
  const stats = calculateTrajectoryStats(points);

  // Build trajectory
  const trajectory: Trajectory = {
    id: uuidv4(),
    entityId: query.entityId,
    points,
    startTime: points[0].timestamp,
    endTime: points[points.length - 1].timestamp,
    totalDistance: stats.totalDistance,
    averageSpeed: stats.averageSpeed,
    maxSpeed: stats.maxSpeed,
    boundingBox: stats.boundingBox,
    attributes: {},
    tenantId: query.context.tenantId,
    policyLabels: query.context.policyLabels,
    provenance: {
      source: 'spacetime-service',
      chain: [],
      confidence: stats.confidence,
    },
    createdAt: Date.now(),
  };

  return trajectory;
}

/**
 * Get multiple trajectory segments (split by gaps)
 */
export function getTrajectorySegments(
  index: SpacetimeIndex,
  query: TrajectoryQuery,
  config: Partial<TrajectoryConfig> = {},
): Trajectory[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Get all entries for entity in time range
  let entries = index.getEntityTimeline(query.entityId, query.timeRange);

  // Filter by policy context
  entries = filterByPolicy(entries, query.context);

  if (entries.length < cfg.minPoints) {
    return [];
  }

  // Split into sequences based on time gaps
  const sequences = findSequences(entries, cfg.maxGapMs);

  const trajectories: Trajectory[] = [];

  for (const sequence of sequences) {
    if (sequence.length < cfg.minPoints) {
      continue;
    }

    // Convert to points
    let points = entriesToPoints(sequence, query.includeSpeed, query.includeHeading);

    // Filter outliers
    points = filterSpeedOutliers(points, cfg.maxSpeedMs);

    if (points.length < cfg.minPoints) {
      continue;
    }

    // Simplify if requested
    if (query.simplifyTolerance !== undefined && query.simplifyTolerance > 0) {
      points = simplifyTrajectory(points, query.simplifyTolerance);
    }

    const stats = calculateTrajectoryStats(points);

    trajectories.push({
      id: uuidv4(),
      entityId: query.entityId,
      points,
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
      totalDistance: stats.totalDistance,
      averageSpeed: stats.averageSpeed,
      maxSpeed: stats.maxSpeed,
      boundingBox: stats.boundingBox,
      attributes: { segmentIndex: trajectories.length },
      tenantId: query.context.tenantId,
      policyLabels: query.context.policyLabels,
      provenance: {
        source: 'spacetime-service',
        chain: [],
        confidence: stats.confidence,
      },
      createdAt: Date.now(),
    });
  }

  return trajectories;
}

/**
 * Compare two trajectories for similarity
 */
export function compareTrajectories(
  a: Trajectory,
  b: Trajectory,
): {
  spatialSimilarity: number;
  temporalOverlap: number;
  averageDistance: number;
} {
  // Calculate temporal overlap
  const overlapStart = Math.max(a.startTime, b.startTime);
  const overlapEnd = Math.min(a.endTime, b.endTime);
  const overlapDuration = Math.max(0, overlapEnd - overlapStart);
  const maxDuration = Math.max(a.endTime - a.startTime, b.endTime - b.startTime);
  const temporalOverlap = maxDuration > 0 ? overlapDuration / maxDuration : 0;

  if (temporalOverlap === 0) {
    return { spatialSimilarity: 0, temporalOverlap: 0, averageDistance: Infinity };
  }

  // Calculate spatial similarity using Frechet-like distance
  // Sample points from both trajectories at matching times
  const sampleTimes: number[] = [];
  const sampleInterval = overlapDuration / 10;

  for (let t = overlapStart; t <= overlapEnd; t += sampleInterval) {
    sampleTimes.push(t);
  }

  let totalDistance = 0;
  let validSamples = 0;

  for (const t of sampleTimes) {
    const pointA = interpolatePoint(a.points, t);
    const pointB = interpolatePoint(b.points, t);

    if (pointA && pointB) {
      totalDistance += haversineDistance(pointA.coordinate, pointB.coordinate);
      validSamples++;
    }
  }

  const averageDistance = validSamples > 0 ? totalDistance / validSamples : Infinity;

  // Convert to similarity score (exponential decay)
  const spatialSimilarity = Math.exp(-averageDistance / 1000); // 1km scale

  return { spatialSimilarity, temporalOverlap, averageDistance };
}

/**
 * Convert spacetime entries to trajectory points
 */
function entriesToPoints(
  entries: SpacetimeEntry[],
  includeSpeed: boolean,
  includeHeading: boolean,
): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const point: TrajectoryPoint = {
      coordinate: entry.coordinate,
      timestamp: entry.start,
      attributes: { ...entry.attributes },
    };

    if (includeSpeed && i > 0) {
      const prev = entries[i - 1];
      const distance = haversineDistance(prev.coordinate, entry.coordinate);
      const timeDelta = (entry.start - prev.start) / 1000;

      if (timeDelta > 0) {
        point.speed = distance / timeDelta;
      }
    }

    if (includeHeading && i > 0) {
      const prev = entries[i - 1];
      point.heading = calculateBearing(prev.coordinate, entry.coordinate);
    }

    points.push(point);
  }

  return points;
}

/**
 * Filter points with unrealistic speeds
 */
function filterSpeedOutliers(
  points: TrajectoryPoint[],
  maxSpeed: number,
): TrajectoryPoint[] {
  if (points.length <= 1) {
    return points;
  }

  const filtered: TrajectoryPoint[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = points[i];

    const distance = haversineDistance(prev.coordinate, curr.coordinate);
    const timeDelta = (curr.timestamp - prev.timestamp) / 1000;

    if (timeDelta > 0) {
      const speed = distance / timeDelta;
      if (speed <= maxSpeed) {
        filtered.push(curr);
      }
    } else if (timeDelta === 0 && distance === 0) {
      // Duplicate point, keep it
      filtered.push(curr);
    }
  }

  return filtered;
}

/**
 * Simplify trajectory using Douglas-Peucker algorithm
 */
function simplifyTrajectory(
  points: TrajectoryPoint[],
  tolerance: number,
): TrajectoryPoint[] {
  if (points.length <= 2) {
    return points;
  }

  const coordinates = points.map((p) => p.coordinate);
  const simplified = simplifyPath(coordinates, tolerance);

  // Map back to trajectory points
  const result: TrajectoryPoint[] = [];
  let coordIndex = 0;

  for (const point of points) {
    if (coordIndex < simplified.length) {
      const simplifiedCoord = simplified[coordIndex];
      if (
        point.coordinate.latitude === simplifiedCoord.latitude &&
        point.coordinate.longitude === simplifiedCoord.longitude
      ) {
        result.push(point);
        coordIndex++;
      }
    }
  }

  return result;
}

/**
 * Calculate trajectory statistics
 */
function calculateTrajectoryStats(points: TrajectoryPoint[]): {
  totalDistance: number;
  averageSpeed: number;
  maxSpeed: number;
  boundingBox: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  confidence: number;
} {
  if (points.length === 0) {
    return {
      totalDistance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      boundingBox: { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 },
      confidence: 0,
    };
  }

  const coordinates = points.map((p) => p.coordinate);
  const totalDistance = calculatePathDistance(coordinates);
  const duration = (points[points.length - 1].timestamp - points[0].timestamp) / 1000;
  const averageSpeed = duration > 0 ? totalDistance / duration : 0;

  let maxSpeed = 0;
  for (const point of points) {
    if (point.speed !== undefined && point.speed > maxSpeed) {
      maxSpeed = point.speed;
    }
  }

  const boundingBox = calculateBoundingBox(coordinates);

  // Confidence based on point density and consistency
  const avgPointInterval = duration / (points.length - 1);
  const intervalConsistency = Math.min(1, 60 / avgPointInterval); // Prefer ~1 point/min
  const pointDensity = Math.min(1, points.length / 10); // 10+ points = full score

  const confidence = 0.5 * intervalConsistency + 0.5 * pointDensity;

  return {
    totalDistance,
    averageSpeed,
    maxSpeed,
    boundingBox,
    confidence,
  };
}

/**
 * Interpolate a point at a specific timestamp
 */
function interpolatePoint(
  points: TrajectoryPoint[],
  timestamp: number,
): TrajectoryPoint | null {
  if (points.length === 0) {
    return null;
  }

  // Find surrounding points
  let before: TrajectoryPoint | null = null;
  let after: TrajectoryPoint | null = null;

  for (const point of points) {
    if (point.timestamp <= timestamp) {
      before = point;
    }
    if (point.timestamp >= timestamp && !after) {
      after = point;
      break;
    }
  }

  if (!before && !after) {
    return null;
  }

  if (!before) {
    return after;
  }

  if (!after) {
    return before;
  }

  if (before.timestamp === after.timestamp) {
    return before;
  }

  // Linear interpolation
  const ratio =
    (timestamp - before.timestamp) / (after.timestamp - before.timestamp);

  return {
    coordinate: {
      latitude:
        before.coordinate.latitude +
        (after.coordinate.latitude - before.coordinate.latitude) * ratio,
      longitude:
        before.coordinate.longitude +
        (after.coordinate.longitude - before.coordinate.longitude) * ratio,
      elevation:
        before.coordinate.elevation !== undefined &&
        after.coordinate.elevation !== undefined
          ? before.coordinate.elevation +
            (after.coordinate.elevation - before.coordinate.elevation) * ratio
          : undefined,
    },
    timestamp,
    attributes: {},
  };
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
