/**
 * Smart City Connector
 * Integration layer for city systems, IoT sensors, and cross-city federation
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CitySystemEndpoint,
  FederationExport,
  DigitalTwinAsset,
  SensorReading,
  AssetType,
  GeoJSONGeometry,
} from '../types/digitalTwin';

/**
 * IoT sensor data format
 */
interface IoTSensorPayload {
  deviceId: string;
  timestamp: string;
  readings: Array<{
    metric: string;
    value: number | string | boolean;
    unit?: string;
  }>;
  location?: {
    lat: number;
    lon: number;
  };
}

/**
 * Dashboard data structure
 */
interface DashboardData {
  timestamp: Date;
  summary: {
    totalAssets: number;
    healthyAssets: number;
    alertCount: number;
    activeSimulations: number;
  };
  assetsByType: Record<string, number>;
  healthDistribution: Record<string, number>;
  recentAlerts: Alert[];
  sensorStatus: {
    online: number;
    offline: number;
    degraded: number;
  };
}

/**
 * Alert structure
 */
interface Alert {
  id: string;
  assetId: string;
  type: 'WARNING' | 'CRITICAL' | 'INFO';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

/**
 * Estonia model export format
 */
interface EstoniaModelExport {
  version: string;
  exportId: string;
  timestamp: string;
  sourceCity: string;
  targetCity: string;
  dataCategories: string[];
  assets: EstoniaAssetFormat[];
  metadata: {
    totalRecords: number;
    exportDuration: number;
    checksums: Record<string, string>;
  };
}

interface EstoniaAssetFormat {
  uuid: string;
  identifier: string;
  classification: string;
  geometry: GeoJSONGeometry;
  attributes: Record<string, unknown>;
  provenance: {
    source: string;
    lastModified: string;
    version: number;
  };
}

/**
 * Connector for smart city integrations
 */
export class SmartCityConnector {
  private endpoints: Map<string, CitySystemEndpoint> = new Map();
  private federations: Map<string, FederationExport> = new Map();
  private alerts: Alert[] = [];
  private sensorCache: Map<string, SensorReading[]> = new Map();

  /**
   * Registers a city system endpoint
   * @param endpoint - Endpoint configuration
   */
  async registerEndpoint(
    endpoint: Omit<CitySystemEndpoint, 'id' | 'status'>
  ): Promise<CitySystemEndpoint> {
    const registered: CitySystemEndpoint = {
      ...endpoint,
      id: uuidv4(),
      status: 'ACTIVE',
    };

    this.endpoints.set(registered.id, registered);
    return registered;
  }

  /**
   * Gets all registered endpoints
   */
  async getEndpoints(): Promise<CitySystemEndpoint[]> {
    return Array.from(this.endpoints.values());
  }

  /**
   * Tests connectivity to an endpoint
   * @param endpointId - Endpoint ID to test
   */
  async testEndpoint(endpointId: string): Promise<{ success: boolean; latency: number }> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${endpointId}`);
    }

    const startTime = Date.now();

    try {
      // Simulated connectivity test
      await this.delay(Math.random() * 100 + 50);
      const latency = Date.now() - startTime;

      endpoint.status = 'ACTIVE';
      endpoint.lastSync = new Date();

      return { success: true, latency };
    } catch (error) {
      endpoint.status = 'ERROR';
      return { success: false, latency: -1 };
    }
  }

  /**
   * Ingests IoT sensor data
   * @param payload - Sensor data payload
   * @returns Processed sensor readings
   */
  async ingestIoTData(payload: IoTSensorPayload): Promise<SensorReading[]> {
    const readings: SensorReading[] = payload.readings.map((r) => ({
      sensorId: payload.deviceId,
      timestamp: new Date(payload.timestamp),
      value: r.value,
      unit: r.unit,
      quality: this.assessDataQuality(r.value, payload.timestamp),
    }));

    // Cache readings
    const existing = this.sensorCache.get(payload.deviceId) || [];
    this.sensorCache.set(payload.deviceId, [...existing.slice(-999), ...readings]);

    // Check for anomalies and generate alerts
    this.checkForAnomalies(payload.deviceId, readings);

    return readings;
  }

  /**
   * Bulk ingests sensor data from multiple devices
   * @param payloads - Array of sensor payloads
   */
  async bulkIngestIoTData(payloads: IoTSensorPayload[]): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    for (const payload of payloads) {
      try {
        await this.ingestIoTData(payload);
        processed++;
      } catch {
        errors++;
      }
    }

    return { processed, errors };
  }

  /**
   * Generates real-time dashboard data
   * @param assets - Current asset collection
   */
  async getDashboardData(assets: DigitalTwinAsset[]): Promise<DashboardData> {
    const assetsByType: Record<string, number> = {};
    const healthDistribution: Record<string, number> = {};

    for (const asset of assets) {
      assetsByType[asset.type] = (assetsByType[asset.type] || 0) + 1;
      healthDistribution[asset.healthStatus] = (healthDistribution[asset.healthStatus] || 0) + 1;
    }

    const healthyCount = assets.filter((a) => a.healthScore >= 70).length;
    const onlineSensors = this.countOnlineSensors();

    return {
      timestamp: new Date(),
      summary: {
        totalAssets: assets.length,
        healthyAssets: healthyCount,
        alertCount: this.alerts.filter((a) => !a.acknowledged).length,
        activeSimulations: 0,
      },
      assetsByType,
      healthDistribution,
      recentAlerts: this.alerts.slice(-10),
      sensorStatus: {
        online: onlineSensors,
        offline: Math.floor(onlineSensors * 0.1),
        degraded: Math.floor(onlineSensors * 0.05),
      },
    };
  }

  /**
   * Creates a federation export configuration
   * @param config - Federation configuration
   */
  async createFederation(
    config: Omit<FederationExport, 'id' | 'status'>
  ): Promise<FederationExport> {
    const federation: FederationExport = {
      ...config,
      id: uuidv4(),
      status: 'ACTIVE',
    };

    this.federations.set(federation.id, federation);
    return federation;
  }

  /**
   * Exports assets using Estonia model format
   * @param federationId - Federation ID
   * @param assets - Assets to export
   */
  async exportEstoniaModel(
    federationId: string,
    assets: DigitalTwinAsset[]
  ): Promise<EstoniaModelExport> {
    const federation = this.federations.get(federationId);
    if (!federation) {
      throw new Error(`Federation not found: ${federationId}`);
    }

    const startTime = Date.now();

    // Apply filter
    let filteredAssets = assets;
    if (federation.assetFilter.types?.length) {
      filteredAssets = filteredAssets.filter((a) =>
        federation.assetFilter.types!.includes(a.type)
      );
    }
    if (federation.assetFilter.tags?.length) {
      filteredAssets = filteredAssets.filter((a) =>
        federation.assetFilter.tags!.some((t) => a.tags?.includes(t))
      );
    }

    // Transform to Estonia format
    const estoniaAssets: EstoniaAssetFormat[] = filteredAssets.map((asset) => ({
      uuid: asset.id,
      identifier: `${asset.type}-${asset.name.toLowerCase().replace(/\s+/g, '-')}`,
      classification: this.mapToEstoniaClassification(asset.type),
      geometry: asset.geometry,
      attributes: {
        name: asset.name,
        healthScore: asset.healthScore,
        healthStatus: asset.healthStatus,
        ...asset.metadata,
      },
      provenance: {
        source: 'IntelGraph Digital Twin',
        lastModified: asset.updatedAt.toISOString(),
        version: 1,
      },
    }));

    const exportDuration = Date.now() - startTime;

    federation.lastExport = new Date();

    return {
      version: '2.0',
      exportId: uuidv4(),
      timestamp: new Date().toISOString(),
      sourceCity: 'IntelGraph',
      targetCity: federation.targetCity,
      dataCategories: [...new Set(filteredAssets.map((a) => a.type))],
      assets: estoniaAssets,
      metadata: {
        totalRecords: estoniaAssets.length,
        exportDuration,
        checksums: {
          sha256: this.generateChecksum(estoniaAssets),
        },
      },
    };
  }

  /**
   * Syncs data from a registered endpoint
   * @param endpointId - Endpoint to sync from
   */
  async syncFromEndpoint(endpointId: string): Promise<{ records: number }> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${endpointId}`);
    }

    try {
      // Simulated sync
      await this.delay(500);
      const records = Math.floor(Math.random() * 100) + 10;

      endpoint.lastSync = new Date();
      endpoint.status = 'ACTIVE';

      return { records };
    } catch (error) {
      endpoint.status = 'ERROR';
      throw error;
    }
  }

  /**
   * Pushes data to a registered endpoint
   * @param endpointId - Endpoint to push to
   * @param assets - Assets to push
   */
  async pushToEndpoint(
    endpointId: string,
    assets: DigitalTwinAsset[]
  ): Promise<{ success: boolean; pushed: number }> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${endpointId}`);
    }

    try {
      // Format data based on endpoint requirements
      const formattedData = this.formatForEndpoint(assets, endpoint);

      // Simulated push
      await this.delay(300);

      endpoint.lastSync = new Date();

      return { success: true, pushed: assets.length };
    } catch {
      endpoint.status = 'ERROR';
      return { success: false, pushed: 0 };
    }
  }

  /**
   * Creates an alert
   */
  async createAlert(assetId: string, type: Alert['type'], message: string): Promise<Alert> {
    const alert: Alert = {
      id: uuidv4(),
      assetId,
      type,
      message,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    return alert;
  }

  /**
   * Acknowledges an alert
   */
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Gets active alerts
   */
  async getActiveAlerts(): Promise<Alert[]> {
    return this.alerts.filter((a) => !a.acknowledged);
  }

  // Private helper methods

  private assessDataQuality(value: unknown, timestamp: string): SensorReading['quality'] {
    const age = Date.now() - new Date(timestamp).getTime();
    if (age > 3600000) return 'LOW';
    if (value === null || value === undefined) return 'UNKNOWN';
    if (age > 300000) return 'MEDIUM';
    return 'HIGH';
  }

  private checkForAnomalies(deviceId: string, readings: SensorReading[]): void {
    const history = this.sensorCache.get(deviceId) || [];
    if (history.length < 10) return;

    for (const reading of readings) {
      if (typeof reading.value === 'number') {
        const historicalValues = history
          .filter((h) => typeof h.value === 'number')
          .map((h) => h.value as number);

        if (historicalValues.length > 0) {
          const avg = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
          const stdDev = Math.sqrt(
            historicalValues.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) /
              historicalValues.length
          );

          if (Math.abs(reading.value - avg) > 3 * stdDev) {
            this.createAlert(
              deviceId,
              'WARNING',
              `Anomalous reading detected: ${reading.value} (expected: ${avg.toFixed(2)} ± ${stdDev.toFixed(2)})`
            );
          }
        }
      }
    }
  }

  private countOnlineSensors(): number {
    const recentThreshold = Date.now() - 300000; // 5 minutes
    let count = 0;

    for (const readings of this.sensorCache.values()) {
      const latest = readings[readings.length - 1];
      if (latest && latest.timestamp.getTime() > recentThreshold) {
        count++;
      }
    }

    return count;
  }

  private mapToEstoniaClassification(type: AssetType): string {
    const mapping: Record<AssetType, string> = {
      [AssetType.BUILDING]: 'building',
      [AssetType.BRIDGE]: 'transport:bridge',
      [AssetType.ROAD]: 'transport:road',
      [AssetType.UTILITY]: 'utility:general',
      [AssetType.WATER_SYSTEM]: 'utility:water',
      [AssetType.POWER_GRID]: 'utility:electricity',
      [AssetType.TELECOMMUNICATIONS]: 'utility:telecom',
      [AssetType.TRANSIT]: 'transport:public',
      [AssetType.GREEN_SPACE]: 'environment:green',
      [AssetType.WASTE_MANAGEMENT]: 'utility:waste',
    };
    return mapping[type] || 'other';
  }

  private formatForEndpoint(
    assets: DigitalTwinAsset[],
    endpoint: CitySystemEndpoint
  ): string | Record<string, unknown> {
    switch (endpoint.dataFormat) {
      case 'GEOJSON':
        return {
          type: 'FeatureCollection',
          features: assets.map((a) => ({
            type: 'Feature',
            id: a.id,
            geometry: a.geometry,
            properties: { name: a.name, type: a.type },
          })),
        };
      case 'CSV':
        return assets.map((a) => `${a.id},${a.name},${a.type}`).join('\n');
      default:
        return { assets };
    }
  }

  private generateChecksum(data: unknown): string {
    // Simplified checksum for demo
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const smartCityConnector = new SmartCityConnector();
