// @ts-nocheck
/**
 * Digital Twin Service
 * Manages digital twin assets with real-time sensor integration and synchronization
 */

import { v4 as uuidv4 } from 'uuid';
import {
  DigitalTwinAsset,
  AssetType,
  TwinSyncState,
  HealthStatus,
  SensorReading,
  GeoJSONGeometry,
  GeoJSONFeatureCollection,
  CreateAssetInput,
  UpdateAssetInput,
  AssetQueryFilter,
} from '../types/digitalTwin';

/**
 * Service for managing digital twin assets
 */
export class DigitalTwinService {
  private assets: Map<string, DigitalTwinAsset> = new Map();
  private sensorDataBuffer: Map<string, SensorReading[]> = new Map();

  /**
   * Creates a new digital twin asset
   */
  async createAsset(input: CreateAssetInput): Promise<DigitalTwinAsset> {
    const now = new Date();
    const asset: DigitalTwinAsset = {
      id: uuidv4(),
      name: input.name,
      type: input.type,
      geometry: input.geometry,
      metadata: input.metadata || {},
      sensorBindings: input.sensorBindings || [],
      lastSync: now,
      syncState: TwinSyncState.SYNCED,
      healthStatus: HealthStatus.GOOD,
      healthScore: 100,
      parentId: input.parentId,
      childIds: [],
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    this.assets.set(asset.id, asset);

    if (input.parentId) {
      const parent = this.assets.get(input.parentId);
      if (parent) {
        parent.childIds = [...(parent.childIds || []), asset.id];
      }
    }

    return asset;
  }

  /**
   * Retrieves an asset by ID
   */
  async getAsset(id: string): Promise<DigitalTwinAsset | null> {
    return this.assets.get(id) || null;
  }

  /**
   * Updates an existing asset
   */
  async updateAsset(id: string, input: UpdateAssetInput): Promise<DigitalTwinAsset> {
    const asset = this.assets.get(id);
    if (!asset) {
      throw new Error(`Asset not found: ${id}`);
    }

    const updatedAsset: DigitalTwinAsset = {
      ...asset,
      ...input,
      metadata: { ...asset.metadata, ...input.metadata },
      updatedAt: new Date(),
    };

    this.assets.set(id, updatedAsset);
    return updatedAsset;
  }

  /**
   * Deletes an asset
   */
  async deleteAsset(id: string): Promise<boolean> {
    const asset = this.assets.get(id);
    if (!asset) {
      return false;
    }

    if (asset.parentId) {
      const parent = this.assets.get(asset.parentId);
      if (parent) {
        parent.childIds = (parent.childIds || []).filter((cid) => cid !== id);
      }
    }

    for (const childId of asset.childIds || []) {
      const child = this.assets.get(childId);
      if (child) {
        child.parentId = undefined;
      }
    }

    this.assets.delete(id);
    this.sensorDataBuffer.delete(id);
    return true;
  }

  /**
   * Queries assets based on filter criteria
   */
  async queryAssets(filter: AssetQueryFilter): Promise<DigitalTwinAsset[]> {
    let results = Array.from(this.assets.values());

    if (filter.types?.length) {
      results = results.filter((a) => filter.types!.includes(a.type));
    }

    if (filter.tags?.length) {
      results = results.filter((a) =>
        filter.tags!.some((tag) => a.tags?.includes(tag))
      );
    }

    if (filter.healthStatus?.length) {
      results = results.filter((a) => filter.healthStatus!.includes(a.healthStatus));
    }

    if (filter.syncState?.length) {
      results = results.filter((a) => filter.syncState!.includes(a.syncState));
    }

    if (filter.parentId) {
      results = results.filter((a) => a.parentId === filter.parentId);
    }

    if (filter.area) {
      results = results.filter((a) => this.isWithinArea(a.geometry, filter.area!));
    }

    return results;
  }

  /**
   * Ingests sensor reading and updates asset state
   */
  async ingestSensorData(assetId: string, reading: SensorReading): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const buffer = this.sensorDataBuffer.get(assetId) || [];
    buffer.push(reading);
    if (buffer.length > 1000) {
      buffer.shift();
    }
    this.sensorDataBuffer.set(assetId, buffer);

    const binding = asset.sensorBindings.find((b) => b.sensorId === reading.sensorId);
    if (binding) {
      binding.lastReading = reading;
    }

    asset.lastSync = new Date();
    asset.syncState = TwinSyncState.SYNCED;
    asset.updatedAt = new Date();
  }

  /**
   * Synchronizes asset state with physical counterpart
   */
  async syncAssetState(assetId: string): Promise<DigitalTwinAsset> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    try {
      asset.syncState = TwinSyncState.PENDING;

      const buffer = this.sensorDataBuffer.get(assetId) || [];
      const healthScore = this.calculateHealthScore(asset, buffer);

      asset.healthScore = healthScore;
      asset.healthStatus = this.getHealthStatus(healthScore);
      asset.syncState = TwinSyncState.SYNCED;
      asset.lastSync = new Date();
      asset.updatedAt = new Date();

      return asset;
    } catch (error) {
      asset.syncState = TwinSyncState.ERROR;
      throw error;
    }
  }

  /**
   * Exports assets as GeoJSON FeatureCollection
   */
  async exportToGeoJSON(filter?: AssetQueryFilter): Promise<GeoJSONFeatureCollection> {
    const assets = filter ? await this.queryAssets(filter) : Array.from(this.assets.values());

    return {
      type: 'FeatureCollection',
      features: assets.map((asset) => ({
        type: 'Feature' as const,
        id: asset.id,
        geometry: asset.geometry,
        properties: {
          name: asset.name,
          type: asset.type,
          healthStatus: asset.healthStatus,
          healthScore: asset.healthScore,
          syncState: asset.syncState,
          lastSync: asset.lastSync.toISOString(),
          metadata: asset.metadata,
          tags: asset.tags,
        },
      })),
    };
  }

  /**
   * Exports assets for smart city integration
   */
  async exportForSmartCity(assetIds: string[]): Promise<SmartCityExport> {
    const assets = assetIds
      .map((id) => this.assets.get(id))
      .filter((a): a is DigitalTwinAsset => a !== undefined);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      sourceSystem: 'IntelGraph Digital Twin',
      assets: assets.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        location: a.geometry,
        status: {
          health: a.healthStatus,
          score: a.healthScore,
          lastSync: a.lastSync.toISOString(),
        },
        sensors: a.sensorBindings.map((s) => ({
          id: s.sensorId,
          type: s.sensorType,
          lastValue: s.lastReading?.value,
          lastUpdate: s.lastReading?.timestamp?.toISOString(),
        })),
        metadata: a.metadata,
      })),
    };
  }

  private calculateHealthScore(asset: DigitalTwinAsset, readings: SensorReading[]): number {
    if (readings.length === 0) {
      return asset.healthScore;
    }

    const recentReadings = readings.filter(
      (r) => Date.now() - r.timestamp.getTime() < 3600000
    );

    if (recentReadings.length === 0) {
      return Math.max(asset.healthScore - 5, 0);
    }

    const qualityScores = { HIGH: 1, MEDIUM: 0.8, LOW: 0.5, UNKNOWN: 0.3 };
    const avgQuality =
      recentReadings.reduce((sum, r) => sum + qualityScores[r.quality], 0) /
      recentReadings.length;

    return Math.round(avgQuality * 100);
  }

  private getHealthStatus(score: number): HealthStatus {
    if (score >= 90) return HealthStatus.EXCELLENT;
    if (score >= 70) return HealthStatus.GOOD;
    if (score >= 50) return HealthStatus.FAIR;
    if (score >= 25) return HealthStatus.POOR;
    return HealthStatus.CRITICAL;
  }

  private isWithinArea(geometry: GeoJSONGeometry, area: GeoJSONGeometry): boolean {
    if (geometry.type === 'Point' && area.type === 'Polygon') {
      const [x, y] = geometry.coordinates as number[];
      const polygon = area.coordinates as number[][][];
      return this.pointInPolygon([x, y], polygon[0]);
    }
    return true;
  }

  private pointInPolygon(point: number[], polygon: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      if (
        yi > point[1] !== yj > point[1] &&
        point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
    return inside;
  }
}

interface SmartCityExport {
  version: string;
  exportedAt: string;
  sourceSystem: string;
  assets: Array<{
    id: string;
    name: string;
    type: AssetType;
    location: GeoJSONGeometry;
    status: {
      health: HealthStatus;
      score: number;
      lastSync: string;
    };
    sensors: Array<{
      id: string;
      type: string;
      lastValue?: unknown;
      lastUpdate?: string;
    }>;
    metadata: Record<string, unknown>;
  }>;
}

export const digitalTwinService = new DigitalTwinService();
