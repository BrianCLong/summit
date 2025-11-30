import { UncertaintyField, FieldPoint } from '../models/UncertaintyField.js';
import { TurbulentZone, ZoneBounds, UncertaintyDriver } from '../models/TurbulentZone.js';

export interface ZoneConfig {
  threshold: number;
  minClusterSize: number;
  epsilon?: number;
}

interface Cluster {
  points: FieldPoint[];
  centroid: Record<string, number>;
}

/**
 * Identify turbulent zones (high uncertainty regions) in uncertainty fields
 */
export class ZoneIdentifier {
  private config: ZoneConfig;

  constructor(config: ZoneConfig = { threshold: 0.7, minClusterSize: 3 }) {
    this.config = {
      ...config,
      epsilon: config.epsilon || this.calculateAdaptiveEpsilon(),
    };
  }

  /**
   * Identify all turbulent zones in field
   */
  async identify(field: UncertaintyField): Promise<TurbulentZone[]> {
    // 1. Filter high-uncertainty points
    const highUncertaintyPoints = this.filterHighUncertainty(
      field.points,
      this.config.threshold
    );

    if (highUncertaintyPoints.length < this.config.minClusterSize) {
      return [];
    }

    // 2. Cluster using DBSCAN
    const clusters = this.dbscan(highUncertaintyPoints, field);

    // 3. Convert clusters to turbulent zones
    const zones = clusters.map(cluster => this.clusterToZone(cluster, field));

    // 4. Filter by minimum size
    return zones.filter(zone => zone.volume > 0);
  }

  /**
   * Filter points above uncertainty threshold
   */
  private filterHighUncertainty(points: FieldPoint[], threshold: number): FieldPoint[] {
    return points.filter(p => p.uncertainty >= threshold);
  }

  /**
   * DBSCAN clustering algorithm
   */
  private dbscan(points: FieldPoint[], field: UncertaintyField): Cluster[] {
    const clusters: Cluster[] = [];
    const visited = new Set<number>();
    const clustered = new Set<number>();

    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;
      visited.add(i);

      const neighbors = this.regionQuery(points, i, this.config.epsilon!, field);

      if (neighbors.length < this.config.minClusterSize) {
        continue; // Mark as noise
      }

      // Start new cluster
      const cluster: number[] = [i];
      clustered.add(i);

      // Expand cluster
      let j = 0;
      while (j < neighbors.length) {
        const neighborIdx = neighbors[j];

        if (!visited.has(neighborIdx)) {
          visited.add(neighborIdx);

          const neighborNeighbors = this.regionQuery(
            points,
            neighborIdx,
            this.config.epsilon!,
            field
          );

          if (neighborNeighbors.length >= this.config.minClusterSize) {
            neighbors.push(...neighborNeighbors);
          }
        }

        if (!clustered.has(neighborIdx)) {
          cluster.push(neighborIdx);
          clustered.add(neighborIdx);
        }

        j++;
      }

      // Create cluster object
      const clusterPoints = cluster.map(idx => points[idx]);
      clusters.push({
        points: clusterPoints,
        centroid: this.calculateCentroid(clusterPoints),
      });
    }

    return clusters;
  }

  /**
   * Find neighbors within epsilon distance
   */
  private regionQuery(
    points: FieldPoint[],
    pointIdx: number,
    epsilon: number,
    field: UncertaintyField
  ): number[] {
    const neighbors: number[] = [];
    const point = points[pointIdx];

    for (let i = 0; i < points.length; i++) {
      if (i === pointIdx) continue;

      const distance = this.calculateDistance(
        point.coordinates,
        points[i].coordinates,
        field
      );

      if (distance <= epsilon) {
        neighbors.push(i);
      }
    }

    return neighbors;
  }

  /**
   * Calculate normalized distance between points
   */
  private calculateDistance(
    coord1: Record<string, number>,
    coord2: Record<string, number>,
    field: UncertaintyField
  ): number {
    let sumSquares = 0;

    for (const dimension of field.dimensions) {
      const name = dimension.name;
      const v1 = coord1[name];
      const v2 = coord2[name];

      if (v1 !== undefined && v2 !== undefined) {
        // Normalize by dimension range
        const range = (dimension.range.max || 1) - (dimension.range.min || 0);
        const normalizedDiff = (v1 - v2) / (range || 1);
        sumSquares += normalizedDiff * normalizedDiff;
      }
    }

    return Math.sqrt(sumSquares);
  }

  /**
   * Calculate centroid of cluster
   */
  private calculateCentroid(points: FieldPoint[]): Record<string, number> {
    const centroid: Record<string, number> = {};
    const dimensions = Object.keys(points[0].coordinates);

    for (const dimension of dimensions) {
      const sum = points.reduce((s, p) => s + (p.coordinates[dimension] || 0), 0);
      centroid[dimension] = sum / points.length;
    }

    return centroid;
  }

  /**
   * Convert cluster to turbulent zone
   */
  private clusterToZone(cluster: Cluster, field: UncertaintyField): TurbulentZone {
    // Calculate bounds
    const bounds = this.calculateBounds(cluster.points, field);

    // Calculate intensity (peak uncertainty)
    const intensity = Math.max(...cluster.points.map(p => p.uncertainty));

    // Calculate volume
    const volume = this.calculateVolume(bounds, field);

    // Calculate persistence
    const persistence = this.calculatePersistence(cluster, field);

    // Identify drivers
    const drivers = this.identifyDrivers(cluster, field);

    return new TurbulentZone({
      fieldId: field.id,
      bounds,
      intensity,
      volume,
      persistence,
      drivers,
    });
  }

  /**
   * Calculate bounds of cluster
   */
  private calculateBounds(points: FieldPoint[], field: UncertaintyField): ZoneBounds {
    const dimensions: Record<string, [number, number]> = {};
    const center: Record<string, number> = {};
    const extent: Record<string, number> = {};

    for (const dimension of field.dimensions) {
      const name = dimension.name;
      const values = points
        .map(p => p.coordinates[name])
        .filter(v => v !== undefined);

      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);

        dimensions[name] = [min, max];
        center[name] = (min + max) / 2;
        extent[name] = max - min;
      }
    }

    return { dimensions, center, extent };
  }

  /**
   * Calculate volume of zone (product of extents)
   */
  private calculateVolume(bounds: ZoneBounds, field: UncertaintyField): number {
    let volume = 1;

    for (const dimension of field.dimensions) {
      const extent = bounds.extent[dimension.name];
      if (extent !== undefined) {
        // Normalize by dimension range
        const range = (dimension.range.max || 1) - (dimension.range.min || 0);
        volume *= extent / (range || 1);
      }
    }

    return volume;
  }

  /**
   * Calculate persistence (temporal stability)
   */
  private calculatePersistence(cluster: Cluster, field: UncertaintyField): number {
    const temporalDim = field.getTemporalDimension();

    if (!temporalDim) {
      return 1.0; // No temporal dimension, assume persistent
    }

    // Group points by time
    const timeValues = cluster.points
      .map(p => p.coordinates[temporalDim.name])
      .filter(v => v !== undefined)
      .sort((a, b) => a - b);

    if (timeValues.length < 2) {
      return 1.0;
    }

    // Calculate temporal extent
    const timeSpan = timeValues[timeValues.length - 1] - timeValues[0];
    const totalRange = (temporalDim.range.max || 1) - (temporalDim.range.min || 0);

    // Persistence is ratio of temporal extent to total range
    return Math.min(1, timeSpan / totalRange);
  }

  /**
   * Identify uncertainty drivers for zone
   */
  private identifyDrivers(cluster: Cluster, field: UncertaintyField): UncertaintyDriver[] {
    const drivers: UncertaintyDriver[] = [];

    // Analyze contribution from each prediction source
    const contributorCounts = new Map<string, number>();
    const contributorUncertainties = new Map<string, number[]>();

    for (const point of cluster.points) {
      for (const contributor of point.contributors) {
        contributorCounts.set(contributor, (contributorCounts.get(contributor) || 0) + 1);

        const uncertainties = contributorUncertainties.get(contributor) || [];
        uncertainties.push(point.uncertainty);
        contributorUncertainties.set(contributor, uncertainties);
      }
    }

    // Calculate contribution percentage and trend
    const totalPoints = cluster.points.length;

    for (const [contributor, count] of contributorCounts.entries()) {
      const contribution = count / totalPoints;
      const uncertainties = contributorUncertainties.get(contributor)!;

      // Calculate trend
      const trend = this.calculateTrend(uncertainties);

      drivers.push({
        factor: `Contributor ${contributor}`,
        contribution,
        trend,
        source: contributor,
        description: `Contributing to ${(contribution * 100).toFixed(1)}% of zone uncertainty`,
      });
    }

    // Sort by contribution
    drivers.sort((a, b) => b.contribution - a.contribution);

    // Return top 5 drivers
    return drivers.slice(0, 5);
  }

  /**
   * Calculate trend from uncertainty values
   */
  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    // Simple linear regression
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((sum, v) => sum + v, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = denominator > 0 ? numerator / denominator : 0;

    if (slope > 0.01) return 'increasing';
    if (slope < -0.01) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate adaptive epsilon based on data density
   */
  private calculateAdaptiveEpsilon(): number {
    // Default epsilon (can be refined based on field characteristics)
    return 0.1;
  }

  /**
   * Merge overlapping zones
   */
  mergeOverlappingZones(zones: TurbulentZone[]): TurbulentZone[] {
    if (zones.length <= 1) return zones;

    const merged: TurbulentZone[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < zones.length; i++) {
      if (processed.has(i)) continue;

      let currentZone = zones[i];
      processed.add(i);

      // Find overlapping zones
      for (let j = i + 1; j < zones.length; j++) {
        if (processed.has(j)) continue;

        if (this.zonesOverlap(currentZone, zones[j])) {
          currentZone = currentZone.mergeWith(zones[j]);
          processed.add(j);
        }
      }

      merged.push(currentZone);
    }

    return merged;
  }

  /**
   * Check if two zones overlap
   */
  private zonesOverlap(zone1: TurbulentZone, zone2: TurbulentZone): boolean {
    const dims1 = zone1.bounds.dimensions;
    const dims2 = zone2.bounds.dimensions;

    // Check overlap in all dimensions
    for (const dimension of Object.keys(dims1)) {
      if (!dims2[dimension]) continue;

      const [min1, max1] = dims1[dimension];
      const [min2, max2] = dims2[dimension];

      // No overlap in this dimension
      if (max1 < min2 || max2 < min1) {
        return false;
      }
    }

    return true;
  }
}
