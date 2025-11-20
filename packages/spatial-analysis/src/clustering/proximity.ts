/**
 * Proximity and distance-based analysis algorithms
 */

import { GeoPoint } from '@intelgraph/geospatial';
import { haversineDistance } from '@intelgraph/geospatial';

export interface NearestNeighbor {
  point: GeoPoint;
  distance: number;
  index: number;
}

export interface ProximityPair {
  point1: GeoPoint;
  point2: GeoPoint;
  distance: number;
  index1: number;
  index2: number;
}

/**
 * Find k-nearest neighbors for a point
 */
export function kNearestNeighbors(
  target: GeoPoint,
  points: GeoPoint[],
  k: number
): NearestNeighbor[] {
  const neighbors = points.map((point, index) => ({
    point,
    distance: haversineDistance(target, point),
    index,
  }));

  // Sort by distance
  neighbors.sort((a, b) => a.distance - b.distance);

  // Return top k (excluding the point itself if it's in the array)
  return neighbors
    .filter((n) => n.distance > 0)
    .slice(0, k);
}

/**
 * Find all neighbors within a given radius
 */
export function neighborsWithinRadius(
  target: GeoPoint,
  points: GeoPoint[],
  radiusMeters: number
): NearestNeighbor[] {
  return points
    .map((point, index) => ({
      point,
      distance: haversineDistance(target, point),
      index,
    }))
    .filter((n) => n.distance <= radiusMeters && n.distance > 0)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Find the nearest point to a target
 */
export function nearestPoint(target: GeoPoint, points: GeoPoint[]): NearestNeighbor | null {
  if (points.length === 0) {
    return null;
  }

  let minDistance = Infinity;
  let nearestIndex = -1;

  points.forEach((point, index) => {
    const distance = haversineDistance(target, point);
    if (distance < minDistance && distance > 0) {
      minDistance = distance;
      nearestIndex = index;
    }
  });

  if (nearestIndex === -1) {
    return null;
  }

  return {
    point: points[nearestIndex],
    distance: minDistance,
    index: nearestIndex,
  };
}

/**
 * Find the farthest point from a target
 */
export function farthestPoint(target: GeoPoint, points: GeoPoint[]): NearestNeighbor | null {
  if (points.length === 0) {
    return null;
  }

  let maxDistance = -Infinity;
  let farthestIndex = -1;

  points.forEach((point, index) => {
    const distance = haversineDistance(target, point);
    if (distance > maxDistance) {
      maxDistance = distance;
      farthestIndex = index;
    }
  });

  return {
    point: points[farthestIndex],
    distance: maxDistance,
    index: farthestIndex,
  };
}

/**
 * Find all pairs of points within a given distance
 */
export function proximityPairs(points: GeoPoint[], maxDistance: number): ProximityPair[] {
  const pairs: ProximityPair[] = [];

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance = haversineDistance(points[i], points[j]);
      if (distance <= maxDistance) {
        pairs.push({
          point1: points[i],
          point2: points[j],
          distance,
          index1: i,
          index2: j,
        });
      }
    }
  }

  return pairs.sort((a, b) => a.distance - b.distance);
}

/**
 * Find the closest pair of points
 */
export function closestPair(points: GeoPoint[]): ProximityPair | null {
  if (points.length < 2) {
    return null;
  }

  let minDistance = Infinity;
  let closestPair: ProximityPair | null = null;

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance = haversineDistance(points[i], points[j]);
      if (distance < minDistance) {
        minDistance = distance;
        closestPair = {
          point1: points[i],
          point2: points[j],
          distance,
          index1: i,
          index2: j,
        };
      }
    }
  }

  return closestPair;
}

/**
 * Calculate average nearest neighbor distance
 */
export function averageNearestNeighborDistance(points: GeoPoint[]): number {
  if (points.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  points.forEach((point) => {
    const nearest = nearestPoint(point, points);
    if (nearest) {
      totalDistance += nearest.distance;
    }
  });

  return totalDistance / points.length;
}

/**
 * Calculate nearest neighbor index (NNI)
 * NNI = observed mean distance / expected mean distance
 * NNI < 1: clustered, NNI = 1: random, NNI > 1: dispersed
 */
export function nearestNeighborIndex(points: GeoPoint[], areaSquareMeters: number): number {
  const observedMean = averageNearestNeighborDistance(points);
  const density = points.length / areaSquareMeters;
  const expectedMean = 1 / (2 * Math.sqrt(density));

  return observedMean / expectedMean;
}

/**
 * Create a spatial index for faster proximity queries
 */
export class SpatialIndex {
  private points: GeoPoint[];
  private grid: Map<string, number[]>;
  private cellSize: number;

  constructor(points: GeoPoint[], cellSizeMeters: number = 1000) {
    this.points = points;
    this.cellSize = cellSizeMeters;
    this.grid = new Map();
    this.buildIndex();
  }

  /**
   * Build the spatial grid index
   */
  private buildIndex(): void {
    this.points.forEach((point, index) => {
      const cellKey = this.getCellKey(point);
      const cell = this.grid.get(cellKey) || [];
      cell.push(index);
      this.grid.set(cellKey, cell);
    });
  }

  /**
   * Get cell key for a point
   */
  private getCellKey(point: GeoPoint): string {
    // Simple grid based on lat/lon
    // In production, use more sophisticated spatial indexing
    const latCell = Math.floor(point.latitude * 1000);
    const lonCell = Math.floor(point.longitude * 1000);
    return `${latCell},${lonCell}`;
  }

  /**
   * Get nearby cells for a point
   */
  private getNearbyCells(point: GeoPoint): string[] {
    const cells: string[] = [];
    const latCell = Math.floor(point.latitude * 1000);
    const lonCell = Math.floor(point.longitude * 1000);

    for (let dlat = -1; dlat <= 1; dlat++) {
      for (let dlon = -1; dlon <= 1; dlon++) {
        cells.push(`${latCell + dlat},${lonCell + dlon}`);
      }
    }

    return cells;
  }

  /**
   * Find neighbors within radius (optimized with spatial index)
   */
  neighborsWithinRadius(target: GeoPoint, radiusMeters: number): NearestNeighbor[] {
    const nearbyCells = this.getNearbyCells(target);
    const candidateIndices = new Set<number>();

    nearbyCells.forEach((cellKey) => {
      const cell = this.grid.get(cellKey);
      if (cell) {
        cell.forEach((index) => candidateIndices.add(index));
      }
    });

    const neighbors: NearestNeighbor[] = [];
    candidateIndices.forEach((index) => {
      const point = this.points[index];
      const distance = haversineDistance(target, point);
      if (distance <= radiusMeters && distance > 0) {
        neighbors.push({ point, distance, index });
      }
    });

    return neighbors.sort((a, b) => a.distance - b.distance);
  }
}
