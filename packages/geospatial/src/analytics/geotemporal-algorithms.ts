/**
 * Geo-Temporal Analytics Algorithms
 *
 * Core algorithms for:
 * - Trajectory building
 * - Stay-point detection
 * - Co-presence/rendezvous detection
 * - Convoy (group movement) detection
 *
 * All algorithms are pure functions independent of storage layer.
 */

import { haversineDistance, centroid } from '../utils/distance.js';
import {
  GeoObservation,
  TrajectoryPoint,
  StayPoint,
  StayPointParams,
  CoPresenceInterval,
  CoPresenceParams,
  Convoy,
  ConvoyParams,
} from '../types/geotemporal.js';
import { GeoPoint } from '../types/geospatial.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Build trajectory from geo-observations
 *
 * @param observations - Array of geo-observations for an entity
 * @returns Sorted array of trajectory points
 */
export function buildTrajectory(observations: GeoObservation[]): TrajectoryPoint[] {
  // Sort by startTime ascending, then endTime
  const sorted = [...observations].sort((a, b) => {
    const startCompare = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    if (startCompare !== 0) return startCompare;
    return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
  });

  // Convert to trajectory points
  return sorted.map((obs) => ({
    observationId: obs.id,
    entityId: obs.entityId,
    latitude: obs.location.latitude,
    longitude: obs.location.longitude,
    startTime: obs.startTime,
    endTime: obs.endTime,
    locationId: obs.location.id,
    elevation: obs.location.elevation,
  }));
}

/**
 * Detect stay points in a trajectory
 *
 * A stay point is a location where an entity remained within a radius
 * for a minimum duration.
 *
 * @param trajectory - Sorted trajectory points
 * @param params - Detection parameters (radiusMeters, minDurationMinutes)
 * @returns Array of detected stay points
 */
export function detectStayPoints(
  trajectory: TrajectoryPoint[],
  params: StayPointParams,
): StayPoint[] {
  const stayPoints: StayPoint[] = [];

  if (trajectory.length === 0) {
    return stayPoints;
  }

  let i = 0;

  while (i < trajectory.length) {
    const startPoint = trajectory[i];
    const startGeo: GeoPoint = {
      latitude: startPoint.latitude,
      longitude: startPoint.longitude,
    };

    // Find longest consecutive window within radiusMeters
    let j = i + 1;
    while (j < trajectory.length) {
      const testPoint = trajectory[j];
      const testGeo: GeoPoint = {
        latitude: testPoint.latitude,
        longitude: testPoint.longitude,
      };

      const distance = haversineDistance(startGeo, testGeo);

      if (distance > params.radiusMeters) {
        break;
      }

      j++;
    }

    // Window is from i to j-1 (inclusive)
    const windowSize = j - i;
    const windowPoints = trajectory.slice(i, j);

    // Calculate time span
    const startTime = new Date(windowPoints[0].startTime).getTime();
    const endTime = new Date(windowPoints[windowPoints.length - 1].endTime).getTime();
    const durationMinutes = (endTime - startTime) / (1000 * 60);

    // Check if duration meets threshold
    if (durationMinutes >= params.minDurationMinutes) {
      // Calculate mean position
      const geoPoints: GeoPoint[] = windowPoints.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));
      const meanPoint = centroid(geoPoints);

      const stayPoint: StayPoint = {
        id: uuidv4(),
        entityId: startPoint.entityId,
        latitude: meanPoint.latitude,
        longitude: meanPoint.longitude,
        startTime: windowPoints[0].startTime,
        endTime: windowPoints[windowPoints.length - 1].endTime,
        radiusMeters: params.radiusMeters,
        numObservations: windowSize,
        locationIds: Array.from(
          new Set(windowPoints.map((p) => p.locationId).filter((id) => id !== undefined)),
        ),
        durationMinutes,
      };

      stayPoints.push(stayPoint);

      // Advance past this stay window
      i = j;
    } else {
      // No stay point detected, advance by one
      i++;
    }
  }

  return stayPoints;
}

/**
 * Detect co-presence intervals between entities
 *
 * Co-presence occurs when multiple entities are within a maximum distance
 * for a minimum time overlap.
 *
 * Currently implements pairwise co-presence detection.
 *
 * @param observations - Observations from multiple entities
 * @param params - Detection parameters (maxDistanceMeters, minOverlapMinutes)
 * @returns Array of co-presence intervals
 */
export function detectCoPresence(
  observations: GeoObservation[],
  params: CoPresenceParams,
): CoPresenceInterval[] {
  const intervals: CoPresenceInterval[] = [];

  // Group observations by entity
  const byEntity = new Map<string, GeoObservation[]>();
  for (const obs of observations) {
    if (!byEntity.has(obs.entityId)) {
      byEntity.set(obs.entityId, []);
    }
    byEntity.get(obs.entityId)!.push(obs);
  }

  const entityIds = Array.from(byEntity.keys());

  // Pairwise co-presence detection
  for (let i = 0; i < entityIds.length; i++) {
    for (let j = i + 1; j < entityIds.length; j++) {
      const entityA = entityIds[i];
      const entityB = entityIds[j];

      const obsA = byEntity.get(entityA)!;
      const obsB = byEntity.get(entityB)!;

      // Check all pairs of observations
      for (const obA of obsA) {
        for (const obB of obsB) {
          // Check temporal overlap
          const startA = new Date(obA.startTime).getTime();
          const endA = new Date(obA.endTime).getTime();
          const startB = new Date(obB.startTime).getTime();
          const endB = new Date(obB.endTime).getTime();

          const overlapStart = Math.max(startA, startB);
          const overlapEnd = Math.min(endA, endB);

          if (overlapStart >= overlapEnd) {
            continue; // No temporal overlap
          }

          const overlapMinutes = (overlapEnd - overlapStart) / (1000 * 60);

          if (overlapMinutes < params.minOverlapMinutes) {
            continue; // Overlap too short
          }

          // Check spatial distance
          const geoA: GeoPoint = {
            latitude: obA.location.latitude,
            longitude: obA.location.longitude,
          };
          const geoB: GeoPoint = {
            latitude: obB.location.latitude,
            longitude: obB.location.longitude,
          };

          const distance = haversineDistance(geoA, geoB);

          if (distance <= params.maxDistanceMeters) {
            // Co-presence detected
            const meanPoint = centroid([geoA, geoB]);

            const interval: CoPresenceInterval = {
              id: uuidv4(),
              entities: [entityA, entityB],
              startTime: new Date(overlapStart).toISOString(),
              endTime: new Date(overlapEnd).toISOString(),
              maxDistanceMeters: distance,
              numOverlappingObservations: 2,
              centroidLatitude: meanPoint.latitude,
              centroidLongitude: meanPoint.longitude,
              overlapDurationMinutes: overlapMinutes,
            };

            intervals.push(interval);
          }
        }
      }
    }
  }

  // Merge overlapping/adjacent intervals for same entity pair
  return mergeCoPresenceIntervals(intervals);
}

/**
 * Merge overlapping or adjacent co-presence intervals for the same entity pair
 */
function mergeCoPresenceIntervals(intervals: CoPresenceInterval[]): CoPresenceInterval[] {
  if (intervals.length === 0) return [];

  // Group by entity pair (sorted to ensure consistent key)
  const grouped = new Map<string, CoPresenceInterval[]>();

  for (const interval of intervals) {
    const key = [...interval.entities].sort().join('|');
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(interval);
  }

  const merged: CoPresenceInterval[] = [];

  // Merge intervals within each group
  for (const [_key, group] of grouped) {
    // Sort by start time
    const sorted = group.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      const currentEnd = new Date(current.endTime).getTime();
      const nextStart = new Date(next.startTime).getTime();

      // Check if intervals overlap or are adjacent (within 1 minute)
      if (nextStart <= currentEnd + 60 * 1000) {
        // Merge
        current = {
          ...current,
          endTime: new Date(Math.max(currentEnd, new Date(next.endTime).getTime())).toISOString(),
          numOverlappingObservations: current.numOverlappingObservations + next.numOverlappingObservations,
          maxDistanceMeters: Math.max(current.maxDistanceMeters, next.maxDistanceMeters),
        };
      } else {
        // No overlap, push current and start new
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);
  }

  return merged;
}

/**
 * Detect convoys (groups of entities moving together)
 *
 * A convoy is a set of entities that remain within maxDistanceMeters
 * for at least minSteps consecutive time steps.
 *
 * Uses simple time discretization and spatial clustering.
 *
 * @param observations - Observations from multiple entities
 * @param params - Detection parameters
 * @returns Array of detected convoys
 */
export function detectConvoys(
  observations: GeoObservation[],
  params: ConvoyParams,
): Convoy[] {
  const stepDurationMs = (params.stepDurationMinutes || 15) * 60 * 1000;

  // Find time bounds
  if (observations.length === 0) {
    return [];
  }

  const times = observations.flatMap((obs) => [
    new Date(obs.startTime).getTime(),
    new Date(obs.endTime).getTime(),
  ]);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  // Discretize time into steps
  const steps: number[] = [];
  for (let t = minTime; t <= maxTime; t += stepDurationMs) {
    steps.push(t);
  }

  // For each step, find which entities are present and their positions
  interface StepSnapshot {
    time: number;
    entities: Map<
      string,
      {
        latitude: number;
        longitude: number;
      }
    >;
  }

  const snapshots: StepSnapshot[] = [];

  for (const stepTime of steps) {
    const entities = new Map<
      string,
      {
        latitude: number;
        longitude: number;
      }
    >();

    // Find observations active at this time
    for (const obs of observations) {
      const start = new Date(obs.startTime).getTime();
      const end = new Date(obs.endTime).getTime();

      if (start <= stepTime && stepTime <= end) {
        // Entity is present at this step
        entities.set(obs.entityId, {
          latitude: obs.location.latitude,
          longitude: obs.location.longitude,
        });
      }
    }

    if (entities.size >= params.minGroupSize) {
      snapshots.push({ time: stepTime, entities });
    }
  }

  // Cluster entities at each step based on distance
  interface Cluster {
    entityIds: Set<string>;
  }

  const clustersPerStep: Cluster[][] = [];

  for (const snapshot of snapshots) {
    const clusters = clusterEntitiesByDistance(snapshot.entities, params.maxDistanceMeters);
    clustersPerStep.push(clusters);
  }

  // Track clusters across consecutive steps to find convoys
  const convoys: Convoy[] = [];

  // Use a simple greedy approach: track cluster persistence
  const trackedConvoys: Array<{
    entities: Set<string>;
    startStep: number;
    endStep: number;
  }> = [];

  for (let stepIdx = 0; stepIdx < clustersPerStep.length; stepIdx++) {
    const stepClusters = clustersPerStep[stepIdx];

    for (const cluster of stepClusters) {
      if (cluster.entityIds.size < params.minGroupSize) {
        continue;
      }

      // Try to match with existing tracked convoy
      let matched = false;

      for (const tracked of trackedConvoys) {
        // Check if cluster has significant overlap with tracked convoy
        const overlap = new Set([...cluster.entityIds].filter((id) => tracked.entities.has(id)));

        if (overlap.size >= Math.min(cluster.entityIds.size, tracked.entities.size) * 0.5) {
          // Extend tracked convoy
          tracked.endStep = stepIdx;
          tracked.entities = new Set([...tracked.entities, ...cluster.entityIds]);
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Start new tracked convoy
        trackedConvoys.push({
          entities: new Set(cluster.entityIds),
          startStep: stepIdx,
          endStep: stepIdx,
        });
      }
    }
  }

  // Filter tracked convoys by minSteps and convert to Convoy objects
  for (const tracked of trackedConvoys) {
    const numSteps = tracked.endStep - tracked.startStep + 1;

    if (numSteps >= params.minSteps && tracked.entities.size >= params.minGroupSize) {
      // Build convoy trajectory
      const trajectoryPoints: Array<{
        stepTime: string;
        centroidLatitude: number;
        centroidLongitude: number;
        entityCount: number;
      }> = [];

      let totalDistance = 0;
      let distanceCount = 0;

      for (let stepIdx = tracked.startStep; stepIdx <= tracked.endStep; stepIdx++) {
        const snapshot = snapshots[stepIdx];
        const convoyEntities = [...tracked.entities].filter((id) => snapshot.entities.has(id));

        if (convoyEntities.length > 0) {
          const points: GeoPoint[] = convoyEntities.map((id) => {
            const pos = snapshot.entities.get(id)!;
            return { latitude: pos.latitude, longitude: pos.longitude };
          });

          const centerPoint = centroid(points);

          trajectoryPoints.push({
            stepTime: new Date(snapshot.time).toISOString(),
            centroidLatitude: centerPoint.latitude,
            centroidLongitude: centerPoint.longitude,
            entityCount: convoyEntities.length,
          });

          // Calculate avg distance from centroid
          for (const point of points) {
            totalDistance += haversineDistance(centerPoint, point);
            distanceCount++;
          }
        }
      }

      const convoy: Convoy = {
        id: uuidv4(),
        entities: Array.from(tracked.entities),
        startTime: new Date(snapshots[tracked.startStep].time).toISOString(),
        endTime: new Date(snapshots[tracked.endStep].time).toISOString(),
        numSteps,
        avgDistanceMeters: distanceCount > 0 ? totalDistance / distanceCount : 0,
        trajectory: trajectoryPoints,
      };

      convoys.push(convoy);
    }
  }

  return convoys;
}

/**
 * Cluster entities by spatial proximity using greedy approach
 */
function clusterEntitiesByDistance(
  entities: Map<string, { latitude: number; longitude: number }>,
  maxDistance: number,
): Array<{ entityIds: Set<string> }> {
  const clusters: Array<{ entityIds: Set<string> }> = [];
  const assigned = new Set<string>();

  const entityArray = Array.from(entities.entries());

  for (const [entityId, pos] of entityArray) {
    if (assigned.has(entityId)) {
      continue;
    }

    // Start new cluster
    const cluster = new Set<string>([entityId]);
    assigned.add(entityId);

    // Find all entities within maxDistance
    for (const [otherId, otherPos] of entityArray) {
      if (assigned.has(otherId)) {
        continue;
      }

      const geo1: GeoPoint = { latitude: pos.latitude, longitude: pos.longitude };
      const geo2: GeoPoint = { latitude: otherPos.latitude, longitude: otherPos.longitude };

      const distance = haversineDistance(geo1, geo2);

      if (distance <= maxDistance) {
        cluster.add(otherId);
        assigned.add(otherId);
      }
    }

    clusters.push({ entityIds: cluster });
  }

  return clusters;
}

/**
 * Calculate total distance traveled in a trajectory
 */
export function calculateTrajectoryDistance(trajectory: TrajectoryPoint[]): number {
  let totalDistance = 0;

  for (let i = 0; i < trajectory.length - 1; i++) {
    const current: GeoPoint = {
      latitude: trajectory[i].latitude,
      longitude: trajectory[i].longitude,
    };
    const next: GeoPoint = {
      latitude: trajectory[i + 1].latitude,
      longitude: trajectory[i + 1].longitude,
    };

    totalDistance += haversineDistance(current, next);
  }

  return totalDistance;
}

/**
 * Calculate average speed in trajectory (meters per second)
 */
export function calculateAverageSpeed(trajectory: TrajectoryPoint[]): number {
  if (trajectory.length < 2) {
    return 0;
  }

  const totalDistance = calculateTrajectoryDistance(trajectory);
  const startTime = new Date(trajectory[0].startTime).getTime();
  const endTime = new Date(trajectory[trajectory.length - 1].endTime).getTime();
  const durationSeconds = (endTime - startTime) / 1000;

  if (durationSeconds === 0) {
    return 0;
  }

  return totalDistance / durationSeconds;
}
