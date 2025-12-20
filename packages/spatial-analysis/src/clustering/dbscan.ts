/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 * clustering algorithm for geospatial data
 */

import { GeoPoint, SpatialCluster } from '@intelgraph/geospatial';
import { haversineDistance, centroid } from '@intelgraph/geospatial';

interface DBSCANConfig {
  epsilon: number; // Maximum distance between points in meters
  minPoints: number; // Minimum points to form a cluster
}

enum PointLabel {
  UNVISITED = 0,
  NOISE = -1,
}

/**
 * DBSCAN clustering implementation
 */
export class DBSCAN {
  private epsilon: number;
  private minPoints: number;

  constructor(config: DBSCANConfig) {
    this.epsilon = config.epsilon;
    this.minPoints = config.minPoints;
  }

  /**
   * Perform DBSCAN clustering on a set of points
   */
  cluster(points: GeoPoint[]): SpatialCluster[] {
    if (points.length === 0) {
      return [];
    }

    const labels = new Array(points.length).fill(PointLabel.UNVISITED);
    let clusterId = 0;

    for (let i = 0; i < points.length; i++) {
      if (labels[i] !== PointLabel.UNVISITED) {
        continue;
      }

      const neighbors = this.regionQuery(points, i);

      if (neighbors.length < this.minPoints) {
        labels[i] = PointLabel.NOISE;
      } else {
        this.expandCluster(points, labels, i, neighbors, clusterId);
        clusterId++;
      }
    }

    return this.createClusters(points, labels, clusterId);
  }

  /**
   * Find all neighbors within epsilon distance
   */
  private regionQuery(points: GeoPoint[], pointIndex: number): number[] {
    const neighbors: number[] = [];
    const point = points[pointIndex];

    for (let i = 0; i < points.length; i++) {
      if (haversineDistance(point, points[i]) <= this.epsilon) {
        neighbors.push(i);
      }
    }

    return neighbors;
  }

  /**
   * Expand a cluster from a core point
   */
  private expandCluster(
    points: GeoPoint[],
    labels: number[],
    pointIndex: number,
    neighbors: number[],
    clusterId: number
  ): void {
    labels[pointIndex] = clusterId;

    let i = 0;
    while (i < neighbors.length) {
      const neighborIndex = neighbors[i];

      if (labels[neighborIndex] === PointLabel.NOISE) {
        labels[neighborIndex] = clusterId;
      }

      if (labels[neighborIndex] !== PointLabel.UNVISITED) {
        i++;
        continue;
      }

      labels[neighborIndex] = clusterId;
      const neighborNeighbors = this.regionQuery(points, neighborIndex);

      if (neighborNeighbors.length >= this.minPoints) {
        // Add new neighbors to the search
        neighborNeighbors.forEach((nn) => {
          if (!neighbors.includes(nn)) {
            neighbors.push(nn);
          }
        });
      }

      i++;
    }
  }

  /**
   * Create cluster objects from labels
   */
  private createClusters(points: GeoPoint[], labels: number[], numClusters: number): SpatialCluster[] {
    const clusters: SpatialCluster[] = [];

    // Create clusters
    for (let clusterId = 0; clusterId < numClusters; clusterId++) {
      const clusterPoints = points.filter((_, index) => labels[index] === clusterId);

      if (clusterPoints.length === 0) {
        continue;
      }

      const clusterCentroid = centroid(clusterPoints);
      const radius = this.calculateClusterRadius(clusterPoints, clusterCentroid);
      const density = clusterPoints.length / (Math.PI * radius * radius);

      clusters.push({
        id: clusterId,
        points: clusterPoints,
        centroid: clusterCentroid,
        radius,
        density,
        noise: false,
      });
    }

    // Add noise cluster
    const noisePoints = points.filter((_, index) => labels[index] === PointLabel.NOISE);
    if (noisePoints.length > 0) {
      clusters.push({
        id: -1,
        points: noisePoints,
        centroid: centroid(noisePoints),
        radius: 0,
        density: 0,
        noise: true,
        label: 'Noise',
      });
    }

    return clusters;
  }

  /**
   * Calculate the radius of a cluster (maximum distance from centroid)
   */
  private calculateClusterRadius(points: GeoPoint[], clusterCentroid: GeoPoint): number {
    return Math.max(...points.map((point) => haversineDistance(clusterCentroid, point)));
  }
}

/**
 * Convenience function to perform DBSCAN clustering
 */
export function dbscan(points: GeoPoint[], epsilon: number, minPoints: number): SpatialCluster[] {
  const clusterer = new DBSCAN({ epsilon, minPoints });
  return clusterer.cluster(points);
}

/**
 * Find optimal epsilon using k-distance graph
 */
export function findOptimalEpsilon(points: GeoPoint[], k: number = 4): number {
  const distances: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const pointDistances: number[] = [];

    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        pointDistances.push(haversineDistance(points[i], points[j]));
      }
    }

    // Sort and get k-th nearest neighbor distance
    pointDistances.sort((a, b) => a - b);
    if (pointDistances.length >= k) {
      distances.push(pointDistances[k - 1]);
    }
  }

  // Find the elbow point (simplified approach)
  distances.sort((a, b) => a - b);
  const medianIndex = Math.floor(distances.length / 2);
  return distances[medianIndex];
}
