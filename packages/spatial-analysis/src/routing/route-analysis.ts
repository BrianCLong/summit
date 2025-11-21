/**
 * Route analysis and path calculations
 */

import { GeoPoint, Route, RouteSegment, Isochrone } from '@intelgraph/geospatial';
import { haversineDistance, bearing, destination } from '@intelgraph/geospatial';
import { Position, Polygon } from 'geojson';

export interface RouteOptions {
  mode?: 'walking' | 'driving' | 'cycling';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  optimize?: boolean;
}

/**
 * Calculate a simple route between waypoints (straight-line approximation)
 * For production, integrate with OSRM or GraphHopper
 */
export function calculateRoute(waypoints: GeoPoint[], options: RouteOptions = {}): Route {
  if (waypoints.length < 2) {
    throw new Error('Route requires at least 2 waypoints');
  }

  const segments: RouteSegment[] = [];
  let totalDistance = 0;
  let totalDuration = 0;

  // Speed estimates based on mode (m/s)
  const speedEstimates: Record<string, number> = {
    walking: 1.4,  // ~5 km/h
    cycling: 5.0,  // ~18 km/h
    driving: 13.9, // ~50 km/h average
  };
  const speed = speedEstimates[options.mode || 'driving'];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];

    const distance = haversineDistance(start, end);
    const duration = distance / speed;

    const segment: RouteSegment = {
      id: `segment-${i}`,
      start,
      end,
      distance,
      duration,
      geometry: [
        [start.longitude, start.latitude],
        [end.longitude, end.latitude],
      ],
      instructions: `Continue ${Math.round(distance)}m to waypoint ${i + 2}`,
    };

    segments.push(segment);
    totalDistance += distance;
    totalDuration += duration;
  }

  const geometry: Position[] = waypoints.map((p) => [p.longitude, p.latitude]);

  return {
    id: `route-${Date.now()}`,
    segments,
    totalDistance,
    totalDuration,
    waypoints,
    geometry,
  };
}

/**
 * Calculate shortest path using Dijkstra's algorithm (for graph-based routing)
 */
export function dijkstraShortestPath(
  graph: Map<string, Map<string, number>>,
  start: string,
  end: string
): { path: string[]; distance: number } | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, string>();
  const unvisited = new Set<string>();

  // Initialize
  for (const node of graph.keys()) {
    distances.set(node, Infinity);
    unvisited.add(node);
  }
  distances.set(start, 0);

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let minNode: string | null = null;
    let minDistance = Infinity;

    for (const node of unvisited) {
      const dist = distances.get(node)!;
      if (dist < minDistance) {
        minDistance = dist;
        minNode = node;
      }
    }

    if (!minNode || minDistance === Infinity) break;
    if (minNode === end) break;

    unvisited.delete(minNode);

    // Update neighbors
    const neighbors = graph.get(minNode);
    if (neighbors) {
      for (const [neighbor, weight] of neighbors) {
        if (!unvisited.has(neighbor)) continue;

        const alt = distances.get(minNode)! + weight;
        if (alt < distances.get(neighbor)!) {
          distances.set(neighbor, alt);
          previous.set(neighbor, minNode);
        }
      }
    }
  }

  // Reconstruct path
  if (!previous.has(end) && start !== end) {
    return null;
  }

  const path: string[] = [];
  let current: string | undefined = end;
  while (current) {
    path.unshift(current);
    current = previous.get(current);
  }

  return {
    path,
    distance: distances.get(end)!,
  };
}

/**
 * Optimize multi-stop route using nearest neighbor heuristic
 */
export function optimizeMultiStop(
  start: GeoPoint,
  stops: GeoPoint[],
  returnToStart = false
): { orderedStops: GeoPoint[]; totalDistance: number } {
  if (stops.length === 0) {
    return { orderedStops: [], totalDistance: 0 };
  }

  const orderedStops: GeoPoint[] = [];
  const remaining = [...stops];
  let current = start;
  let totalDistance = 0;

  while (remaining.length > 0) {
    // Find nearest unvisited stop
    let nearestIndex = 0;
    let nearestDistance = haversineDistance(current, remaining[0]);

    for (let i = 1; i < remaining.length; i++) {
      const dist = haversineDistance(current, remaining[i]);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = i;
      }
    }

    totalDistance += nearestDistance;
    current = remaining[nearestIndex];
    orderedStops.push(current);
    remaining.splice(nearestIndex, 1);
  }

  if (returnToStart) {
    totalDistance += haversineDistance(current, start);
  }

  return { orderedStops, totalDistance };
}

/**
 * Generate isochrone (time-based accessibility zone)
 */
export function generateIsochrone(
  center: GeoPoint,
  timeSeconds: number,
  mode: 'walking' | 'driving' | 'cycling' = 'driving',
  resolution = 36
): Isochrone {
  // Speed estimates (m/s)
  const speeds: Record<string, number> = {
    walking: 1.4,
    cycling: 5.0,
    driving: 13.9,
  };
  const speed = speeds[mode];

  // Calculate radius based on time and speed
  const radius = speed * timeSeconds;

  // Generate polygon points around center
  const coordinates: Position[] = [];
  for (let i = 0; i <= resolution; i++) {
    const angle = (i * 360) / resolution;
    const point = destination(center, radius, angle);
    coordinates.push([point.longitude, point.latitude]);
  }

  // Close the polygon
  if (coordinates.length > 0) {
    coordinates.push(coordinates[0]);
  }

  const geometry: Polygon = {
    type: 'Polygon',
    coordinates: [coordinates],
  };

  // Calculate approximate area (circle approximation)
  const area = Math.PI * radius * radius;

  return {
    center,
    time: timeSeconds,
    mode,
    geometry,
    area,
  };
}

/**
 * Calculate travel time between two points
 */
export function estimateTravelTime(
  from: GeoPoint,
  to: GeoPoint,
  mode: 'walking' | 'driving' | 'cycling' = 'driving'
): number {
  const speeds: Record<string, number> = {
    walking: 1.4,
    cycling: 5.0,
    driving: 13.9,
  };

  const distance = haversineDistance(from, to);
  return distance / speeds[mode];
}

/**
 * Find points reachable within time limit
 */
export function findReachablePoints(
  from: GeoPoint,
  candidates: GeoPoint[],
  maxTimeSeconds: number,
  mode: 'walking' | 'driving' | 'cycling' = 'driving'
): Array<{ point: GeoPoint; travelTime: number }> {
  return candidates
    .map((point) => ({
      point,
      travelTime: estimateTravelTime(from, point, mode),
    }))
    .filter((item) => item.travelTime <= maxTimeSeconds)
    .sort((a, b) => a.travelTime - b.travelTime);
}

/**
 * Calculate path length from array of points
 */
export function calculatePathLength(points: GeoPoint[]): number {
  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += haversineDistance(points[i], points[i + 1]);
  }
  return totalDistance;
}

/**
 * Simplify path using Douglas-Peucker algorithm
 */
export function simplifyPath(points: GeoPoint[], tolerance: number): GeoPoint[] {
  if (points.length <= 2) return points;

  // Find point with maximum distance from line between first and last
  let maxDistance = 0;
  let maxIndex = 0;

  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPath(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(point: GeoPoint, lineStart: GeoPoint, lineEnd: GeoPoint): number {
  const area =
    Math.abs(
      (lineEnd.longitude - lineStart.longitude) * (lineStart.latitude - point.latitude) -
        (lineStart.longitude - point.longitude) * (lineEnd.latitude - lineStart.latitude)
    ) * 111320; // Approximate meters per degree

  const lineLength = haversineDistance(lineStart, lineEnd);

  return lineLength > 0 ? area / lineLength : haversineDistance(point, lineStart);
}
