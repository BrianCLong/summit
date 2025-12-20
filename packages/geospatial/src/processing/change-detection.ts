/**
 * Agentic Change Detection Engine
 * Autonomous monitoring and change detection for denied/degraded environments
 * Supports multi-method ensemble detection with confidence scoring
 */

import { EventEmitter } from 'events';
import * as turf from '@turf/turf';
import { Feature, Geometry, Polygon } from 'geojson';
import {
  SatelliteScene,
  RasterTile,
  SpectralBand,
  ChangeDetectionResult,
  ChangeDetectionMethod,
  DetectedChange,
  ChangeType,
  AgenticTask,
  BoundingBox,
  TileStatistics,
} from '../types/satellite.js';
import { GeoPoint } from '../types/geospatial.js';

export interface ChangeDetectionEvents {
  'task:started': [AgenticTask];
  'task:progress': [string, number, string];
  'change:detected': [DetectedChange];
  'task:completed': [AgenticTask, ChangeDetectionResult];
  'task:failed': [AgenticTask, Error];
  'alert:triggered': [DetectedChange[], string];
}

export interface ChangeDetectionConfig {
  methods: ChangeDetectionMethod[];
  minConfidence: number;
  minChangeMagnitude: number;
  minAreaSqMeters: number;
  maxCloudCover: number;
  ensembleThreshold: number; // Min methods that must agree
  alertThresholds: Record<ChangeType, number>;
}

interface PixelChange {
  x: number;
  y: number;
  beforeValue: number;
  afterValue: number;
  difference: number;
  normalized: number;
}

interface ChangeCluster {
  pixels: PixelChange[];
  centroid: { x: number; y: number };
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  totalMagnitude: number;
}

/**
 * Agentic Change Detection Engine
 */
export class ChangeDetectionEngine extends EventEmitter {
  private config: ChangeDetectionConfig;
  private activeTasks: Map<string, AgenticTask> = new Map();
  private taskTimers: Map<string, NodeJS.Timeout> = new Map();

  // Default thresholds for different change types
  private static readonly DEFAULT_THRESHOLDS: Record<ChangeType, number> = {
    construction: 0.7,
    demolition: 0.7,
    vegetation_gain: 0.5,
    vegetation_loss: 0.6,
    water_change: 0.6,
    vehicle_movement: 0.8,
    infrastructure: 0.7,
    activity_increase: 0.6,
    activity_decrease: 0.6,
    unknown: 0.5,
  };

  constructor(config: Partial<ChangeDetectionConfig> = {}) {
    super();
    this.config = {
      methods: config.methods ?? ['spectral_differencing', 'ndvi_differencing'],
      minConfidence: config.minConfidence ?? 0.6,
      minChangeMagnitude: config.minChangeMagnitude ?? 0.1,
      minAreaSqMeters: config.minAreaSqMeters ?? 100,
      maxCloudCover: config.maxCloudCover ?? 20,
      ensembleThreshold: config.ensembleThreshold ?? 1,
      alertThresholds: config.alertThresholds ?? ChangeDetectionEngine.DEFAULT_THRESHOLDS,
    };
  }

  /**
   * Create and schedule an agentic monitoring task
   */
  createTask(
    aoi: Geometry,
    taskType: AgenticTask['taskType'],
    priority: AgenticTask['priority'],
    parameters: AgenticTask['parameters'] = {}
  ): AgenticTask {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task: AgenticTask = {
      taskId,
      taskType,
      priority,
      aoi,
      parameters: {
        minConfidence: parameters.minConfidence ?? this.config.minConfidence,
        changeTypes: parameters.changeTypes,
        timeWindow: parameters.timeWindow,
        revisitIntervalHours: parameters.revisitIntervalHours ?? 24,
        alertThreshold: parameters.alertThreshold ?? 0.7,
      },
      status: 'queued',
      createdAt: new Date(),
      results: [],
    };

    this.activeTasks.set(taskId, task);

    // Schedule if it's a monitoring task
    if (taskType === 'monitor' && task.parameters.revisitIntervalHours) {
      this.scheduleTask(task);
    }

    return task;
  }

  /**
   * Schedule recurring task execution
   */
  private scheduleTask(task: AgenticTask): void {
    const intervalMs = (task.parameters.revisitIntervalHours ?? 24) * 60 * 60 * 1000;

    const timer = setInterval(() => {
      if (task.status !== 'running') {
        task.nextRunAt = new Date(Date.now() + intervalMs);
        // Task would be executed when new imagery is available
        this.emit('task:started', task);
      }
    }, intervalMs);

    this.taskTimers.set(task.taskId, timer);
    task.nextRunAt = new Date(Date.now() + intervalMs);
  }

  /**
   * Execute change detection between two scenes
   */
  async detectChanges(
    beforeScene: SatelliteScene,
    afterScene: SatelliteScene,
    beforeRaster: Map<SpectralBand, RasterTile>,
    afterRaster: Map<SpectralBand, RasterTile>,
    task?: AgenticTask
  ): Promise<ChangeDetectionResult> {
    const startTime = Date.now();
    const resultId = `cd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (task) {
      task.status = 'running';
      task.lastRunAt = new Date();
      this.emit('task:started', task);
    }

    try {
      // Validate scenes
      this.validateScenes(beforeScene, afterScene);

      const allChanges: Map<string, DetectedChange[]> = new Map();

      // Run each detection method
      for (const method of this.config.methods) {
        this.emit('task:progress', task?.taskId ?? '', 0, `Running ${method}`);

        let methodChanges: DetectedChange[];

        switch (method) {
          case 'spectral_differencing':
            methodChanges = await this.spectralDifferencing(
              beforeRaster,
              afterRaster,
              beforeScene.bbox
            );
            break;
          case 'ndvi_differencing':
            methodChanges = await this.ndviDifferencing(
              beforeRaster,
              afterRaster,
              beforeScene.bbox
            );
            break;
          case 'object_based':
            methodChanges = await this.objectBasedDetection(
              beforeRaster,
              afterRaster,
              beforeScene.bbox
            );
            break;
          case 'hybrid':
          case 'agentic_ensemble':
            // Ensemble combines results from other methods
            continue;
          default:
            methodChanges = [];
        }

        allChanges.set(method, methodChanges);

        // Emit individual changes
        for (const change of methodChanges) {
          this.emit('change:detected', change);
        }
      }

      // Ensemble: merge results from all methods
      const mergedChanges = this.ensembleResults(allChanges);

      // Filter by confidence and area
      const filteredChanges = mergedChanges.filter(
        (c) =>
          c.confidence >= this.config.minConfidence &&
          c.areaSqMeters >= this.config.minAreaSqMeters
      );

      // Classify change types
      const classifiedChanges = await this.classifyChanges(
        filteredChanges,
        beforeRaster,
        afterRaster
      );

      // Calculate overall confidence
      const overallConfidence =
        classifiedChanges.length > 0
          ? classifiedChanges.reduce((sum, c) => sum + c.confidence, 0) / classifiedChanges.length
          : 0;

      const result: ChangeDetectionResult = {
        id: resultId,
        beforeSceneId: beforeScene.id,
        afterSceneId: afterScene.id,
        detectionTimestamp: new Date(),
        method: this.config.methods.length > 1 ? 'agentic_ensemble' : this.config.methods[0],
        bbox: beforeScene.bbox,
        changes: classifiedChanges,
        overallConfidence,
        processingTimeMs: Date.now() - startTime,
      };

      // Check for alerts
      this.checkAlerts(classifiedChanges, task);

      if (task) {
        task.status = 'completed';
        task.results = task.results ?? [];
        task.results.push(result);
        this.emit('task:completed', task, result);
      }

      return result;
    } catch (error) {
      if (task) {
        task.status = 'failed';
        this.emit('task:failed', task, error as Error);
      }
      throw error;
    }
  }

  /**
   * Spectral differencing change detection
   */
  private async spectralDifferencing(
    beforeRaster: Map<SpectralBand, RasterTile>,
    afterRaster: Map<SpectralBand, RasterTile>,
    bbox: BoundingBox
  ): Promise<DetectedChange[]> {
    const changes: DetectedChange[] = [];

    // Use multiple bands if available
    const bands: SpectralBand[] = ['red', 'green', 'blue', 'nir'];
    const availableBands = bands.filter(
      (b) => beforeRaster.has(b) && afterRaster.has(b)
    );

    if (availableBands.length === 0) {
      // Fall back to first available band
      const firstBand = Array.from(beforeRaster.keys())[0];
      if (!firstBand) return [];
      availableBands.push(firstBand);
    }

    // Compute difference for each band and combine
    const allPixelChanges: PixelChange[] = [];

    for (const band of availableBands) {
      const beforeTile = beforeRaster.get(band)!;
      const afterTile = afterRaster.get(band)!;

      const pixelChanges = this.computePixelDifferences(beforeTile, afterTile);
      allPixelChanges.push(...pixelChanges);
    }

    // Cluster significant changes
    const clusters = this.clusterChanges(allPixelChanges, beforeRaster.values().next().value!);

    // Convert clusters to detected changes
    for (const cluster of clusters) {
      const change = this.clusterToChange(cluster, bbox, beforeRaster.values().next().value!);
      if (change.areaSqMeters >= this.config.minAreaSqMeters) {
        changes.push(change);
      }
    }

    return changes;
  }

  /**
   * NDVI differencing for vegetation change detection
   */
  private async ndviDifferencing(
    beforeRaster: Map<SpectralBand, RasterTile>,
    afterRaster: Map<SpectralBand, RasterTile>,
    bbox: BoundingBox
  ): Promise<DetectedChange[]> {
    const changes: DetectedChange[] = [];

    // Need red and NIR bands
    if (
      !beforeRaster.has('red') ||
      !beforeRaster.has('nir') ||
      !afterRaster.has('red') ||
      !afterRaster.has('nir')
    ) {
      return [];
    }

    const beforeRed = beforeRaster.get('red')!;
    const beforeNir = beforeRaster.get('nir')!;
    const afterRed = afterRaster.get('red')!;
    const afterNir = afterRaster.get('nir')!;

    // Compute NDVI for both scenes
    const beforeNdvi = this.computeNDVI(beforeRed, beforeNir);
    const afterNdvi = this.computeNDVI(afterRed, afterNir);

    // Find significant NDVI changes
    const pixelChanges: PixelChange[] = [];

    for (let i = 0; i < beforeNdvi.length; i++) {
      const diff = afterNdvi[i] - beforeNdvi[i];
      const normalized = Math.abs(diff);

      if (normalized > this.config.minChangeMagnitude) {
        const x = i % beforeRed.width;
        const y = Math.floor(i / beforeRed.width);

        pixelChanges.push({
          x,
          y,
          beforeValue: beforeNdvi[i],
          afterValue: afterNdvi[i],
          difference: diff,
          normalized,
        });
      }
    }

    // Cluster and convert
    const clusters = this.clusterChanges(pixelChanges, beforeRed);

    for (const cluster of clusters) {
      const change = this.clusterToChange(cluster, bbox, beforeRed);

      // Determine vegetation change type
      const avgDiff =
        cluster.pixels.reduce((sum, p) => sum + p.difference, 0) / cluster.pixels.length;

      if (avgDiff > 0.1) {
        change.type = 'vegetation_gain';
      } else if (avgDiff < -0.1) {
        change.type = 'vegetation_loss';
      }

      if (change.areaSqMeters >= this.config.minAreaSqMeters) {
        changes.push(change);
      }
    }

    return changes;
  }

  /**
   * Object-based change detection
   */
  private async objectBasedDetection(
    beforeRaster: Map<SpectralBand, RasterTile>,
    afterRaster: Map<SpectralBand, RasterTile>,
    bbox: BoundingBox
  ): Promise<DetectedChange[]> {
    const changes: DetectedChange[] = [];

    // Simplified object-based detection using texture analysis
    const beforeTile = beforeRaster.values().next().value;
    const afterTile = afterRaster.values().next().value;

    if (!beforeTile || !afterTile) return [];

    // Compute local variance (texture measure)
    const beforeTexture = this.computeLocalVariance(beforeTile, 5);
    const afterTexture = this.computeLocalVariance(afterTile, 5);

    // Find texture changes (indicates structural changes)
    const pixelChanges: PixelChange[] = [];

    for (let i = 0; i < beforeTexture.length; i++) {
      const diff = afterTexture[i] - beforeTexture[i];
      const normalized = Math.abs(diff) / (Math.max(beforeTexture[i], afterTexture[i]) + 1);

      if (normalized > this.config.minChangeMagnitude * 2) {
        const x = i % beforeTile.width;
        const y = Math.floor(i / beforeTile.width);

        pixelChanges.push({
          x,
          y,
          beforeValue: beforeTexture[i],
          afterValue: afterTexture[i],
          difference: diff,
          normalized,
        });
      }
    }

    const clusters = this.clusterChanges(pixelChanges, beforeTile);

    for (const cluster of clusters) {
      const change = this.clusterToChange(cluster, bbox, beforeTile);

      // High texture increase often indicates construction
      const avgDiff =
        cluster.pixels.reduce((sum, p) => sum + p.difference, 0) / cluster.pixels.length;

      if (avgDiff > 0) {
        change.type = 'construction';
      } else {
        change.type = 'demolition';
      }

      if (change.areaSqMeters >= this.config.minAreaSqMeters) {
        changes.push(change);
      }
    }

    return changes;
  }

  /**
   * Compute pixel-wise differences
   */
  private computePixelDifferences(
    beforeTile: RasterTile,
    afterTile: RasterTile
  ): PixelChange[] {
    const changes: PixelChange[] = [];
    const length = Math.min(beforeTile.data.length, afterTile.data.length);

    // Compute statistics for normalization
    const beforeStats = this.computeStats(beforeTile.data);
    const afterStats = this.computeStats(afterTile.data);

    for (let i = 0; i < length; i++) {
      const beforeVal = beforeTile.data[i];
      const afterVal = afterTile.data[i];

      // Skip nodata
      if (
        (beforeTile.noDataValue !== undefined && beforeVal === beforeTile.noDataValue) ||
        (afterTile.noDataValue !== undefined && afterVal === afterTile.noDataValue)
      ) {
        continue;
      }

      // Normalize values
      const beforeNorm = (beforeVal - beforeStats.mean) / (beforeStats.stdDev + 0.001);
      const afterNorm = (afterVal - afterStats.mean) / (afterStats.stdDev + 0.001);

      const diff = afterNorm - beforeNorm;
      const normalized = Math.abs(diff);

      if (normalized > this.config.minChangeMagnitude * 2) {
        const x = i % beforeTile.width;
        const y = Math.floor(i / beforeTile.width);

        changes.push({
          x,
          y,
          beforeValue: beforeVal,
          afterValue: afterVal,
          difference: diff,
          normalized,
        });
      }
    }

    return changes;
  }

  /**
   * Compute NDVI array
   */
  private computeNDVI(redTile: RasterTile, nirTile: RasterTile): Float32Array {
    const length = Math.min(redTile.data.length, nirTile.data.length);
    const ndvi = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      const red = redTile.data[i];
      const nir = nirTile.data[i];

      if (
        (redTile.noDataValue !== undefined && red === redTile.noDataValue) ||
        (nirTile.noDataValue !== undefined && nir === nirTile.noDataValue)
      ) {
        ndvi[i] = -9999;
        continue;
      }

      const sum = nir + red;
      ndvi[i] = sum === 0 ? 0 : (nir - red) / sum;
    }

    return ndvi;
  }

  /**
   * Compute local variance (texture)
   */
  private computeLocalVariance(tile: RasterTile, windowSize: number): Float32Array {
    const variance = new Float32Array(tile.data.length);
    const halfWindow = Math.floor(windowSize / 2);

    for (let y = 0; y < tile.height; y++) {
      for (let x = 0; x < tile.width; x++) {
        const values: number[] = [];

        // Collect values in window
        for (let wy = -halfWindow; wy <= halfWindow; wy++) {
          for (let wx = -halfWindow; wx <= halfWindow; wx++) {
            const nx = x + wx;
            const ny = y + wy;

            if (nx >= 0 && nx < tile.width && ny >= 0 && ny < tile.height) {
              const idx = ny * tile.width + nx;
              const val = tile.data[idx];

              if (tile.noDataValue === undefined || val !== tile.noDataValue) {
                values.push(val);
              }
            }
          }
        }

        // Compute variance
        if (values.length > 0) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
          variance[y * tile.width + x] =
            squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        }
      }
    }

    return variance;
  }

  /**
   * Cluster nearby pixel changes using connected components
   */
  private clusterChanges(
    pixelChanges: PixelChange[],
    tile: RasterTile
  ): ChangeCluster[] {
    if (pixelChanges.length === 0) return [];

    // Create a map for quick lookup
    const changeMap = new Map<string, PixelChange>();
    for (const change of pixelChanges) {
      changeMap.set(`${change.x},${change.y}`, change);
    }

    const visited = new Set<string>();
    const clusters: ChangeCluster[] = [];

    // BFS to find connected components
    for (const change of pixelChanges) {
      const key = `${change.x},${change.y}`;
      if (visited.has(key)) continue;

      const cluster: ChangeCluster = {
        pixels: [],
        centroid: { x: 0, y: 0 },
        bbox: { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
        totalMagnitude: 0,
      };

      const queue = [change];
      visited.add(key);

      while (queue.length > 0) {
        const current = queue.shift()!;
        cluster.pixels.push(current);
        cluster.totalMagnitude += current.normalized;

        // Update bbox
        cluster.bbox.minX = Math.min(cluster.bbox.minX, current.x);
        cluster.bbox.minY = Math.min(cluster.bbox.minY, current.y);
        cluster.bbox.maxX = Math.max(cluster.bbox.maxX, current.x);
        cluster.bbox.maxY = Math.max(cluster.bbox.maxY, current.y);

        // Check 8-connected neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            const nx = current.x + dx;
            const ny = current.y + dy;
            const neighborKey = `${nx},${ny}`;

            if (!visited.has(neighborKey) && changeMap.has(neighborKey)) {
              visited.add(neighborKey);
              queue.push(changeMap.get(neighborKey)!);
            }
          }
        }
      }

      // Compute centroid
      cluster.centroid.x =
        cluster.pixels.reduce((sum, p) => sum + p.x, 0) / cluster.pixels.length;
      cluster.centroid.y =
        cluster.pixels.reduce((sum, p) => sum + p.y, 0) / cluster.pixels.length;

      // Only keep clusters with minimum pixels
      if (cluster.pixels.length >= 4) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Convert cluster to DetectedChange
   */
  private clusterToChange(
    cluster: ChangeCluster,
    bbox: BoundingBox,
    tile: RasterTile
  ): DetectedChange {
    // Convert pixel coordinates to geographic coordinates
    const pixelToGeo = (px: number, py: number): [number, number] => {
      const lon =
        bbox.minLon + (px / tile.width) * (bbox.maxLon - bbox.minLon);
      const lat =
        bbox.maxLat - (py / tile.height) * (bbox.maxLat - bbox.minLat);
      return [lon, lat];
    };

    // Create polygon from cluster bbox (simplified)
    const [minLon, maxLat] = pixelToGeo(cluster.bbox.minX, cluster.bbox.minY);
    const [maxLon, minLat] = pixelToGeo(cluster.bbox.maxX, cluster.bbox.maxY);

    const geometry: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat],
        ],
      ],
    };

    const [centroidLon, centroidLat] = pixelToGeo(
      cluster.centroid.x,
      cluster.centroid.y
    );

    // Calculate area
    const areaSqMeters = turf.area(turf.polygon(geometry.coordinates));

    // Calculate confidence based on cluster coherence
    const avgMagnitude = cluster.totalMagnitude / cluster.pixels.length;
    const confidence = Math.min(1.0, avgMagnitude * 2);

    // Calculate magnitude score
    const magnitudeScore = Math.min(1.0, cluster.totalMagnitude / 100);

    return {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'unknown',
      geometry,
      centroid: { longitude: centroidLon, latitude: centroidLat },
      areaSqMeters,
      confidence,
      magnitudeScore,
      beforeValues: cluster.pixels.slice(0, 10).map((p) => p.beforeValue),
      afterValues: cluster.pixels.slice(0, 10).map((p) => p.afterValue),
    };
  }

  /**
   * Ensemble results from multiple methods
   */
  private ensembleResults(
    allChanges: Map<string, DetectedChange[]>
  ): DetectedChange[] {
    if (allChanges.size === 0) return [];
    if (allChanges.size === 1) return Array.from(allChanges.values())[0];

    // Merge overlapping changes from different methods
    const mergedChanges: DetectedChange[] = [];
    const allDetections = Array.from(allChanges.values()).flat();

    // Group by spatial overlap
    const processed = new Set<string>();

    for (const change of allDetections) {
      if (processed.has(change.id)) continue;

      const overlapping = allDetections.filter((other) => {
        if (other.id === change.id || processed.has(other.id)) return false;

        // Check for spatial overlap
        try {
          const intersection = turf.intersect(
            turf.feature(change.geometry),
            turf.feature(other.geometry)
          );
          return intersection !== null;
        } catch {
          return false;
        }
      });

      processed.add(change.id);
      overlapping.forEach((o) => processed.add(o.id));

      if (overlapping.length >= this.config.ensembleThreshold - 1) {
        // Multiple methods detected this change - boost confidence
        const avgConfidence =
          (change.confidence + overlapping.reduce((sum, o) => sum + o.confidence, 0)) /
          (overlapping.length + 1);

        mergedChanges.push({
          ...change,
          confidence: Math.min(1.0, avgConfidence * 1.2),
          description: `Detected by ${overlapping.length + 1} methods`,
        });
      } else if (change.confidence >= this.config.minConfidence) {
        mergedChanges.push(change);
      }
    }

    return mergedChanges;
  }

  /**
   * Classify change types based on spectral signatures
   */
  private async classifyChanges(
    changes: DetectedChange[],
    beforeRaster: Map<SpectralBand, RasterTile>,
    afterRaster: Map<SpectralBand, RasterTile>
  ): Promise<DetectedChange[]> {
    return changes.map((change) => {
      if (change.type !== 'unknown') return change;

      // Simple rule-based classification
      const beforeVals = change.beforeValues ?? [];
      const afterVals = change.afterValues ?? [];

      if (beforeVals.length === 0 || afterVals.length === 0) {
        return change;
      }

      const beforeAvg = beforeVals.reduce((a, b) => a + b, 0) / beforeVals.length;
      const afterAvg = afterVals.reduce((a, b) => a + b, 0) / afterVals.length;
      const diff = afterAvg - beforeAvg;

      // Classify based on brightness change
      if (diff > 50) {
        return { ...change, type: 'construction' };
      } else if (diff < -50) {
        return { ...change, type: 'demolition' };
      } else if (Math.abs(diff) > 20) {
        return { ...change, type: 'activity_increase' };
      }

      return change;
    });
  }

  /**
   * Check if changes warrant alerts
   */
  private checkAlerts(changes: DetectedChange[], task?: AgenticTask): void {
    const alertThreshold = task?.parameters.alertThreshold ?? 0.7;

    const alertableChanges = changes.filter(
      (c) => c.confidence >= alertThreshold
    );

    if (alertableChanges.length > 0) {
      // Group by type
      const byType = new Map<ChangeType, DetectedChange[]>();
      for (const change of alertableChanges) {
        const existing = byType.get(change.type) ?? [];
        existing.push(change);
        byType.set(change.type, existing);
      }

      // Emit alerts for significant change types
      for (const [type, typeChanges] of byType) {
        const typeThreshold = this.config.alertThresholds[type] ?? 0.7;
        const significantChanges = typeChanges.filter(
          (c) => c.confidence >= typeThreshold
        );

        if (significantChanges.length > 0) {
          this.emit(
            'alert:triggered',
            significantChanges,
            `${type}: ${significantChanges.length} high-confidence changes detected`
          );
        }
      }
    }
  }

  /**
   * Validate scene compatibility
   */
  private validateScenes(before: SatelliteScene, after: SatelliteScene): void {
    // Check cloud cover
    if (before.cloudCoverPercent > this.config.maxCloudCover) {
      throw new Error(
        `Before scene cloud cover (${before.cloudCoverPercent}%) exceeds max (${this.config.maxCloudCover}%)`
      );
    }
    if (after.cloudCoverPercent > this.config.maxCloudCover) {
      throw new Error(
        `After scene cloud cover (${after.cloudCoverPercent}%) exceeds max (${this.config.maxCloudCover}%)`
      );
    }

    // Check temporal order
    if (after.acquisitionDate <= before.acquisitionDate) {
      throw new Error('After scene must be acquired after before scene');
    }
  }

  /**
   * Compute basic statistics
   */
  private computeStats(
    data: Float32Array | Uint16Array | Uint8Array
  ): { mean: number; stdDev: number } {
    let sum = 0;
    let count = 0;

    for (let i = 0; i < data.length; i++) {
      sum += data[i];
      count++;
    }

    const mean = sum / count;

    let squaredDiffSum = 0;
    for (let i = 0; i < data.length; i++) {
      squaredDiffSum += Math.pow(data[i] - mean, 2);
    }

    const stdDev = Math.sqrt(squaredDiffSum / count);

    return { mean, stdDev };
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.status = 'failed';
      this.activeTasks.delete(taskId);
    }

    const timer = this.taskTimers.get(taskId);
    if (timer) {
      clearInterval(timer);
      this.taskTimers.delete(taskId);
    }
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): AgenticTask | undefined {
    return this.activeTasks.get(taskId);
  }

  /**
   * Get all active tasks
   */
  getActiveTasks(): AgenticTask[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Cleanup
   */
  dispose(): void {
    for (const timer of this.taskTimers.values()) {
      clearInterval(timer);
    }
    this.taskTimers.clear();
    this.activeTasks.clear();
    this.removeAllListeners();
  }
}

/**
 * Factory for creating change detection engine
 */
export function createChangeDetectionEngine(
  config?: Partial<ChangeDetectionConfig>
): ChangeDetectionEngine {
  return new ChangeDetectionEngine(config);
}
