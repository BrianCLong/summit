/**
 * Automated Data Asset Discovery Service
 * Identifies and catalogs untapped data assets across systems
 */

import { v4 as uuid } from 'uuid';
import {
  DataAsset,
  DataAssetCategory,
  DataQualityLevel,
  SensitivityLevel,
} from '@intelgraph/data-monetization-types';
import { logger } from '../utils/logger.js';

interface DiscoverySource {
  type: 'DATABASE' | 'API' | 'FILE_SYSTEM' | 'STREAM' | 'CLOUD_STORAGE';
  connectionString: string;
  credentials?: Record<string, string>;
}

interface DiscoveredAsset {
  name: string;
  sourceSystem: string;
  schema: Record<string, unknown>;
  estimatedRecordCount: number;
  estimatedSizeBytes: number;
  sampleData?: Record<string, unknown>[];
}

export class AssetDiscoveryService {
  /**
   * Discover data assets from connected sources
   */
  async discoverAssets(
    sources: DiscoverySource[],
    tenantId: string,
    owner: string,
  ): Promise<DataAsset[]> {
    logger.info({ sourceCount: sources.length }, 'Starting asset discovery');

    const discoveredAssets: DataAsset[] = [];

    for (const source of sources) {
      try {
        const assets = await this.scanSource(source, tenantId, owner);
        discoveredAssets.push(...assets);
      } catch (error) {
        logger.error({ source: source.type, error }, 'Failed to scan source');
      }
    }

    logger.info({ assetCount: discoveredAssets.length }, 'Discovery complete');
    return discoveredAssets;
  }

  private async scanSource(
    source: DiscoverySource,
    tenantId: string,
    owner: string,
  ): Promise<DataAsset[]> {
    // Simulated discovery - in production would connect to actual sources
    const discovered = await this.simulateDiscovery(source);
    return discovered.map((d) => this.convertToAsset(d, tenantId, owner));
  }

  private async simulateDiscovery(source: DiscoverySource): Promise<DiscoveredAsset[]> {
    // Simulate discovering assets based on source type
    const templates: Record<string, DiscoveredAsset[]> = {
      DATABASE: [
        {
          name: 'customer_transactions',
          sourceSystem: source.connectionString,
          schema: {
            transaction_id: 'uuid',
            customer_id: 'uuid',
            amount: 'decimal',
            timestamp: 'datetime',
            merchant_category: 'string',
          },
          estimatedRecordCount: 5000000,
          estimatedSizeBytes: 2500000000,
        },
        {
          name: 'user_behavior_logs',
          sourceSystem: source.connectionString,
          schema: {
            session_id: 'uuid',
            user_id: 'uuid',
            action: 'string',
            page_url: 'string',
            timestamp: 'datetime',
            duration_ms: 'integer',
          },
          estimatedRecordCount: 50000000,
          estimatedSizeBytes: 15000000000,
        },
      ],
      API: [
        {
          name: 'real_time_market_data',
          sourceSystem: source.connectionString,
          schema: {
            symbol: 'string',
            price: 'decimal',
            volume: 'integer',
            timestamp: 'datetime',
          },
          estimatedRecordCount: 100000000,
          estimatedSizeBytes: 8000000000,
        },
      ],
      FILE_SYSTEM: [
        {
          name: 'document_corpus',
          sourceSystem: source.connectionString,
          schema: {
            file_path: 'string',
            content: 'text',
            metadata: 'json',
            created_at: 'datetime',
          },
          estimatedRecordCount: 500000,
          estimatedSizeBytes: 50000000000,
        },
      ],
      STREAM: [
        {
          name: 'iot_sensor_data',
          sourceSystem: source.connectionString,
          schema: {
            device_id: 'string',
            sensor_type: 'string',
            reading: 'float',
            latitude: 'float',
            longitude: 'float',
            timestamp: 'datetime',
          },
          estimatedRecordCount: 1000000000,
          estimatedSizeBytes: 100000000000,
        },
      ],
      CLOUD_STORAGE: [
        {
          name: 'media_assets',
          sourceSystem: source.connectionString,
          schema: {
            object_key: 'string',
            content_type: 'string',
            size_bytes: 'integer',
            tags: 'array',
          },
          estimatedRecordCount: 2000000,
          estimatedSizeBytes: 500000000000,
        },
      ],
    };

    return templates[source.type] || [];
  }

  private convertToAsset(
    discovered: DiscoveredAsset,
    tenantId: string,
    owner: string,
  ): DataAsset {
    const category = this.inferCategory(discovered);
    const quality = this.assessQuality(discovered);
    const sensitivity = this.assessSensitivity(discovered);

    return {
      id: uuid(),
      name: discovered.name,
      description: `Auto-discovered asset from ${discovered.sourceSystem}`,
      category,
      qualityLevel: quality,
      sensitivityLevel: sensitivity,
      sourceSystem: discovered.sourceSystem,
      schema: discovered.schema,
      metadata: {
        recordCount: discovered.estimatedRecordCount,
        sizeBytes: discovered.estimatedSizeBytes,
        lastUpdated: new Date().toISOString(),
      },
      tags: this.generateTags(discovered),
      owner,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private inferCategory(discovered: DiscoveredAsset): DataAssetCategory {
    const name = discovered.name.toLowerCase();
    const schemaKeys = Object.keys(discovered.schema).join(' ').toLowerCase();

    if (name.includes('transaction') || schemaKeys.includes('amount')) return 'TRANSACTION';
    if (name.includes('behavior') || name.includes('log')) return 'BEHAVIORAL';
    if (schemaKeys.includes('latitude') || schemaKeys.includes('longitude')) return 'GEOSPATIAL';
    if (name.includes('sensor') || name.includes('iot')) return 'SENSOR';
    if (name.includes('media') || name.includes('image')) return 'MEDIA';
    if (schemaKeys.includes('timestamp') && discovered.estimatedRecordCount > 10000000) return 'TIMESERIES';
    if (name.includes('document') || name.includes('content')) return 'UNSTRUCTURED';
    return 'STRUCTURED';
  }

  private assessQuality(discovered: DiscoveredAsset): DataQualityLevel {
    // Simple heuristic based on schema completeness
    const schemaFields = Object.keys(discovered.schema).length;
    if (schemaFields >= 10) return 'ENRICHED';
    if (schemaFields >= 5) return 'CLEANSED';
    return 'RAW';
  }

  private assessSensitivity(discovered: DiscoveredAsset): SensitivityLevel {
    const schemaKeys = Object.keys(discovered.schema).join(' ').toLowerCase();

    if (schemaKeys.includes('ssn') || schemaKeys.includes('credit_card')) return 'RESTRICTED';
    if (schemaKeys.includes('email') || schemaKeys.includes('phone')) return 'CONFIDENTIAL';
    if (schemaKeys.includes('user_id') || schemaKeys.includes('customer_id')) return 'INTERNAL';
    return 'PUBLIC';
  }

  private generateTags(discovered: DiscoveredAsset): string[] {
    const tags: string[] = [];
    const name = discovered.name.toLowerCase();

    if (name.includes('customer')) tags.push('customer-data');
    if (name.includes('transaction')) tags.push('financial');
    if (name.includes('behavior')) tags.push('analytics');
    if (name.includes('sensor')) tags.push('iot');
    if (discovered.estimatedRecordCount > 1000000) tags.push('large-scale');
    if (discovered.estimatedRecordCount > 100000000) tags.push('big-data');

    return tags;
  }

  /**
   * Profile a specific asset for deeper analysis
   */
  async profileAsset(asset: DataAsset): Promise<{
    dataProfile: Record<string, unknown>;
    qualityMetrics: Record<string, number>;
    recommendations: string[];
  }> {
    // Simulated profiling
    return {
      dataProfile: {
        columnCount: Object.keys(asset.schema || {}).length,
        estimatedRows: asset.metadata.recordCount,
        sizeBytes: asset.metadata.sizeBytes,
        lastUpdated: asset.metadata.lastUpdated,
      },
      qualityMetrics: {
        completeness: 0.85,
        accuracy: 0.92,
        consistency: 0.88,
        timeliness: 0.75,
      },
      recommendations: [
        'Consider enriching with external data sources',
        'Implement data validation rules',
        'Add more descriptive metadata',
      ],
    };
  }
}

export const assetDiscoveryService = new AssetDiscoveryService();
