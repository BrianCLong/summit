import { haversineDistance } from '../utils/distance.js';
import type { GeoPoint, SpatialCluster } from '../types/geospatial.js';

export interface ClusteringOptions {
  epsilonMeters?: number;
  minPoints?: number;
}

export const clusterPoints = (
  points: GeoPoint[],
  options: ClusteringOptions = {}
): SpatialCluster[] => {
  const eps = options.epsilonMeters ?? 500;
  const minPts = options.minPoints ?? 3;
  const visited = new Set<number>();
  const clusters: SpatialCluster[] = [];

  const neighbors = (idx: number) =>
    points.reduce<number[]>((acc, point, candidateIdx) => {
      if (idx === candidateIdx) return acc;
      if (haversineDistance(points[idx], point) <= eps) {
        acc.push(candidateIdx);
      }
      return acc;
    }, []);

  const expandCluster = (idx: number, clusterId: number, clusterPointsIdx: number[]) => {
    const queue = [idx];
    while (queue.length) {
      const current = queue.pop();
      if (current === undefined || visited.has(current)) continue;
      visited.add(current);
      clusterPointsIdx.push(current);
      const currentNeighbors = neighbors(current);
      if (currentNeighbors.length >= minPts) {
        queue.push(...currentNeighbors);
      }
    }
  };

  points.forEach((_, idx) => {
    if (visited.has(idx)) return;
    const neighborPts = neighbors(idx);
    if (neighborPts.length + 1 < minPts) {
      visited.add(idx);
      return;
    }

    const clusterIndices: number[] = [];
    expandCluster(idx, clusters.length, clusterIndices);
    const clusterPointsList = clusterIndices.map((i) => points[i]);
    const centroid = calculateCentroid(clusterPointsList);
    const radius = Math.max(
      ...clusterPointsList.map((p) => haversineDistance(p, centroid)),
      0
    );
    clusters.push({
      id: clusters.length,
      points: clusterPointsList,
      centroid,
      radius,
      density: clusterPointsList.length / (Math.PI * Math.max(radius, 1) ** 2),
    });
  });

  return clusters;
};

const calculateCentroid = (points: GeoPoint[]): GeoPoint => {
  const sum = points.reduce(
    (acc, point) => {
      acc.lat += point.latitude;
      acc.lon += point.longitude;
      return acc;
    },
    { lat: 0, lon: 0 }
  );
  return {
    latitude: sum.lat / Math.max(points.length, 1),
    longitude: sum.lon / Math.max(points.length, 1),
  };
};
