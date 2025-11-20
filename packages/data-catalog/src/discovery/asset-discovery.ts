/**
 * Asset Discovery
 * Discover, register, and manage data assets in the catalog
 * Provides CRUD operations and asset lifecycle management
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  DataAsset,
  AssetType,
  AssetStatus,
  AssetRelationship,
  RelationshipType,
  MetadataTag,
  CatalogEvent,
  CatalogEventType,
} from '../types.js';

/**
 * Asset discovery configuration
 */
export interface AssetDiscoveryConfig {
  /** Database connection pool */
  pool: Pool;
  /** Enable automatic relationship discovery */
  autoDiscoverRelationships?: boolean;
  /** Enable audit logging */
  enableAudit?: boolean;
}

/**
 * Asset filter options
 */
export interface AssetFilter {
  /** Filter by asset types */
  types?: AssetType[];
  /** Filter by status */
  status?: AssetStatus[];
  /** Filter by owner */
  owner?: string;
  /** Filter by tags */
  tags?: string[];
  /** Filter by classification */
  classification?: string[];
  /** Filter by source system */
  sourceSystem?: string;
  /** Filter by certification status */
  certified?: boolean;
  /** Full-text search */
  searchText?: string;
}

/**
 * Asset Discovery Service
 * Manages the lifecycle of data assets in the catalog
 */
export class AssetDiscovery {
  private pool: Pool;
  private config: AssetDiscoveryConfig;

  constructor(config: AssetDiscoveryConfig) {
    this.pool = config.pool;
    this.config = {
      autoDiscoverRelationships: config.autoDiscoverRelationships ?? true,
      enableAudit: config.enableAudit ?? true,
    };
  }

  /**
   * Initialize database schema for asset storage
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Create assets table
      await client.query(`
        CREATE TABLE IF NOT EXISTS catalog_assets (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          type TEXT NOT NULL,
          description TEXT,
          classification TEXT NOT NULL,
          status TEXT NOT NULL,
          source JSONB NOT NULL,
          schema JSONB,
          owner TEXT NOT NULL,
          stewards TEXT[] DEFAULT '{}',
          tags JSONB DEFAULT '[]',
          business_terms TEXT[] DEFAULT '{}',
          quality_metrics JSONB,
          lineage JSONB,
          usage_stats JSONB,
          custom_metadata JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_by TEXT NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_by TEXT NOT NULL,
          last_profiled TIMESTAMP,
          certified BOOLEAN DEFAULT FALSE,
          certified_by TEXT,
          certified_at TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_assets_type ON catalog_assets(type);
        CREATE INDEX IF NOT EXISTS idx_assets_status ON catalog_assets(status);
        CREATE INDEX IF NOT EXISTS idx_assets_owner ON catalog_assets(owner);
        CREATE INDEX IF NOT EXISTS idx_assets_classification ON catalog_assets(classification);
        CREATE INDEX IF NOT EXISTS idx_assets_name ON catalog_assets(name);
        CREATE INDEX IF NOT EXISTS idx_assets_search ON catalog_assets USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
      `);

      // Create relationships table
      await client.query(`
        CREATE TABLE IF NOT EXISTS catalog_relationships (
          id UUID PRIMARY KEY,
          source_id UUID NOT NULL REFERENCES catalog_assets(id) ON DELETE CASCADE,
          target_id UUID NOT NULL REFERENCES catalog_assets(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          description TEXT,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_by TEXT NOT NULL,
          UNIQUE(source_id, target_id, type)
        );

        CREATE INDEX IF NOT EXISTS idx_relationships_source ON catalog_relationships(source_id);
        CREATE INDEX IF NOT EXISTS idx_relationships_target ON catalog_relationships(target_id);
        CREATE INDEX IF NOT EXISTS idx_relationships_type ON catalog_relationships(type);
      `);

      // Create audit events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS catalog_events (
          id UUID PRIMARY KEY,
          type TEXT NOT NULL,
          asset_id UUID REFERENCES catalog_assets(id) ON DELETE SET NULL,
          user_id TEXT NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
          details JSONB NOT NULL,
          ip_address TEXT,
          user_agent TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_events_type ON catalog_events(type);
        CREATE INDEX IF NOT EXISTS idx_events_asset ON catalog_events(asset_id);
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON catalog_events(timestamp DESC);
      `);

      console.log('Asset discovery schema initialized successfully');
    } finally {
      client.release();
    }
  }

  /**
   * Register a new data asset
   */
  async registerAsset(asset: DataAsset): Promise<DataAsset> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Ensure ID is set
      if (!asset.id) {
        asset.id = uuidv4();
      }

      // Set timestamps
      const now = new Date();
      asset.createdAt = asset.createdAt || now;
      asset.updatedAt = now;

      // Insert asset
      await client.query(
        `
        INSERT INTO catalog_assets (
          id, name, display_name, type, description, classification, status,
          source, schema, owner, stewards, tags, business_terms,
          quality_metrics, lineage, usage_stats, custom_metadata,
          created_at, created_by, updated_at, updated_by, last_profiled,
          certified, certified_by, certified_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        )
      `,
        [
          asset.id,
          asset.name,
          asset.displayName,
          asset.type,
          asset.description,
          asset.classification,
          asset.status,
          JSON.stringify(asset.source),
          asset.schema ? JSON.stringify(asset.schema) : null,
          asset.owner,
          asset.stewards,
          JSON.stringify(asset.tags),
          asset.businessTerms,
          asset.qualityMetrics ? JSON.stringify(asset.qualityMetrics) : null,
          asset.lineage ? JSON.stringify(asset.lineage) : null,
          asset.usageStats ? JSON.stringify(asset.usageStats) : null,
          asset.customMetadata ? JSON.stringify(asset.customMetadata) : null,
          asset.createdAt,
          asset.createdBy,
          asset.updatedAt,
          asset.updatedBy,
          asset.lastProfiled,
          asset.certified || false,
          asset.certifiedBy,
          asset.certifiedAt,
        ]
      );

      // Log audit event
      if (this.config.enableAudit) {
        await this.logEvent(
          {
            id: uuidv4(),
            type: CatalogEventType.ASSET_CREATED,
            assetId: asset.id,
            userId: asset.createdBy,
            timestamp: now,
            details: {
              assetName: asset.name,
              assetType: asset.type,
            },
          },
          client
        );
      }

      // Discover relationships
      if (this.config.autoDiscoverRelationships) {
        await this.discoverRelationships(asset, client);
      }

      await client.query('COMMIT');
      return asset;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing data asset
   */
  async updateAsset(id: string, updates: Partial<DataAsset>): Promise<DataAsset> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get existing asset
      const existing = await this.getAssetById(id);
      if (!existing) {
        throw new Error(`Asset not found: ${id}`);
      }

      // Merge updates
      const updated = { ...existing, ...updates };
      updated.updatedAt = new Date();

      // Update asset
      await client.query(
        `
        UPDATE catalog_assets SET
          name = $2,
          display_name = $3,
          type = $4,
          description = $5,
          classification = $6,
          status = $7,
          source = $8,
          schema = $9,
          owner = $10,
          stewards = $11,
          tags = $12,
          business_terms = $13,
          quality_metrics = $14,
          lineage = $15,
          usage_stats = $16,
          custom_metadata = $17,
          updated_at = $18,
          updated_by = $19,
          last_profiled = $20,
          certified = $21,
          certified_by = $22,
          certified_at = $23
        WHERE id = $1
      `,
        [
          id,
          updated.name,
          updated.displayName,
          updated.type,
          updated.description,
          updated.classification,
          updated.status,
          JSON.stringify(updated.source),
          updated.schema ? JSON.stringify(updated.schema) : null,
          updated.owner,
          updated.stewards,
          JSON.stringify(updated.tags),
          updated.businessTerms,
          updated.qualityMetrics ? JSON.stringify(updated.qualityMetrics) : null,
          updated.lineage ? JSON.stringify(updated.lineage) : null,
          updated.usageStats ? JSON.stringify(updated.usageStats) : null,
          updated.customMetadata ? JSON.stringify(updated.customMetadata) : null,
          updated.updatedAt,
          updated.updatedBy,
          updated.lastProfiled,
          updated.certified || false,
          updated.certifiedBy,
          updated.certifiedAt,
        ]
      );

      // Log audit event
      if (this.config.enableAudit) {
        await this.logEvent(
          {
            id: uuidv4(),
            type: CatalogEventType.ASSET_UPDATED,
            assetId: id,
            userId: updated.updatedBy,
            timestamp: updated.updatedAt,
            details: {
              updates: Object.keys(updates),
            },
          },
          client
        );
      }

      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get asset by ID
   */
  async getAssetById(id: string): Promise<DataAsset | null> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_assets WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAsset(result.rows[0]);
  }

  /**
   * Get asset by name
   */
  async getAssetByName(name: string): Promise<DataAsset | null> {
    const result = await this.pool.query(
      'SELECT * FROM catalog_assets WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAsset(result.rows[0]);
  }

  /**
   * List assets with filtering
   */
  async listAssets(filter?: AssetFilter, limit: number = 100, offset: number = 0): Promise<{
    assets: DataAsset[];
    total: number;
  }> {
    let query = 'SELECT * FROM catalog_assets WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filter?.types && filter.types.length > 0) {
      query += ` AND type = ANY($${paramIndex}::text[])`;
      params.push(filter.types);
      paramIndex++;
    }

    if (filter?.status && filter.status.length > 0) {
      query += ` AND status = ANY($${paramIndex}::text[])`;
      params.push(filter.status);
      paramIndex++;
    }

    if (filter?.owner) {
      query += ` AND owner = $${paramIndex}`;
      params.push(filter.owner);
      paramIndex++;
    }

    if (filter?.classification && filter.classification.length > 0) {
      query += ` AND classification = ANY($${paramIndex}::text[])`;
      params.push(filter.classification);
      paramIndex++;
    }

    if (filter?.sourceSystem) {
      query += ` AND source->>'system' = $${paramIndex}`;
      params.push(filter.sourceSystem);
      paramIndex++;
    }

    if (filter?.certified !== undefined) {
      query += ` AND certified = $${paramIndex}`;
      params.push(filter.certified);
      paramIndex++;
    }

    if (filter?.searchText) {
      query += ` AND to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $${paramIndex})`;
      params.push(filter.searchText);
      paramIndex++;
    }

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM (${query}) AS filtered`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Add pagination
    query += ` ORDER BY updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Get assets
    const result = await this.pool.query(query, params);
    const assets = result.rows.map((row) => this.mapRowToAsset(row));

    return { assets, total };
  }

  /**
   * Delete an asset
   */
  async deleteAsset(id: string, deletedBy: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Log audit event before deletion
      if (this.config.enableAudit) {
        const asset = await this.getAssetById(id);
        if (asset) {
          await this.logEvent(
            {
              id: uuidv4(),
              type: CatalogEventType.ASSET_DELETED,
              assetId: id,
              userId: deletedBy,
              timestamp: new Date(),
              details: {
                assetName: asset.name,
                assetType: asset.type,
              },
            },
            client
          );
        }
      }

      // Delete asset (relationships will be cascade deleted)
      await client.query('DELETE FROM catalog_assets WHERE id = $1', [id]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add a relationship between assets
   */
  async addRelationship(relationship: AssetRelationship): Promise<AssetRelationship> {
    if (!relationship.id) {
      relationship.id = uuidv4();
    }

    await this.pool.query(
      `
      INSERT INTO catalog_relationships (
        id, source_id, target_id, type, description, metadata, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (source_id, target_id, type) DO UPDATE SET
        description = EXCLUDED.description,
        metadata = EXCLUDED.metadata
    `,
      [
        relationship.id,
        relationship.sourceId,
        relationship.targetId,
        relationship.type,
        relationship.description,
        relationship.metadata ? JSON.stringify(relationship.metadata) : null,
        relationship.createdAt || new Date(),
        relationship.createdBy,
      ]
    );

    return relationship;
  }

  /**
   * Get relationships for an asset
   */
  async getRelationships(assetId: string): Promise<AssetRelationship[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM catalog_relationships
      WHERE source_id = $1 OR target_id = $1
      ORDER BY created_at DESC
    `,
      [assetId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      targetId: row.target_id,
      type: row.type as RelationshipType,
      description: row.description,
      metadata: row.metadata,
      createdAt: row.created_at,
      createdBy: row.created_by,
    }));
  }

  /**
   * Certify an asset
   */
  async certifyAsset(assetId: string, certifiedBy: string): Promise<DataAsset> {
    return this.updateAsset(assetId, {
      certified: true,
      certifiedBy,
      certifiedAt: new Date(),
      updatedBy: certifiedBy,
    });
  }

  /**
   * Add tags to an asset
   */
  async addTags(assetId: string, tags: MetadataTag[]): Promise<DataAsset> {
    const asset = await this.getAssetById(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    asset.tags.push(...tags);
    return this.updateAsset(assetId, { tags: asset.tags });
  }

  /**
   * Remove tags from an asset
   */
  async removeTags(assetId: string, tagIds: string[]): Promise<DataAsset> {
    const asset = await this.getAssetById(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    asset.tags = asset.tags.filter((tag) => !tagIds.includes(tag.id));
    return this.updateAsset(assetId, { tags: asset.tags });
  }

  /**
   * Discover relationships based on schema
   */
  private async discoverRelationships(asset: DataAsset, client: any): Promise<void> {
    if (!asset.schema || asset.type !== AssetType.TABLE) {
      return;
    }

    // Find foreign key relationships
    for (const field of asset.schema.fields) {
      if (field.isForeignKey && field.foreignKeyReference) {
        const { table } = field.foreignKeyReference;

        // Find target asset
        const targetAsset = await this.getAssetByName(table);
        if (targetAsset) {
          await this.addRelationship({
            id: uuidv4(),
            sourceId: asset.id,
            targetId: targetAsset.id,
            type: RelationshipType.USES,
            description: `Foreign key relationship via ${field.name}`,
            createdAt: new Date(),
            createdBy: 'system',
          });
        }
      }
    }
  }

  /**
   * Log an audit event
   */
  private async logEvent(event: CatalogEvent, client: any): Promise<void> {
    await client.query(
      `
      INSERT INTO catalog_events (
        id, type, asset_id, user_id, timestamp, details, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        event.id,
        event.type,
        event.assetId,
        event.userId,
        event.timestamp,
        JSON.stringify(event.details),
        event.ipAddress,
        event.userAgent,
      ]
    );
  }

  /**
   * Map database row to DataAsset
   */
  private mapRowToAsset(row: any): DataAsset {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      type: row.type as AssetType,
      description: row.description,
      classification: row.classification,
      status: row.status as AssetStatus,
      source: row.source,
      schema: row.schema,
      owner: row.owner,
      stewards: row.stewards || [],
      tags: row.tags || [],
      businessTerms: row.business_terms || [],
      qualityMetrics: row.quality_metrics,
      lineage: row.lineage,
      usageStats: row.usage_stats,
      customMetadata: row.custom_metadata,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      lastProfiled: row.last_profiled,
      certified: row.certified,
      certifiedBy: row.certified_by,
      certifiedAt: row.certified_at,
    };
  }
}
