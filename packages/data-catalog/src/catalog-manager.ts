/**
 * Data Catalog Manager
 *
 * Central repository for all data assets metadata
 */

import { Pool } from 'pg';

export interface DataAsset {
  assetId: string;
  name: string;
  type: 'table' | 'view' | 'materialized_view' | 'cube';
  schema: string;
  description?: string;
  owner?: string;
  tags?: string[];
  classification?: 'public' | 'internal' | 'confidential' | 'restricted';
  columns: ColumnMetadata[];
  statistics?: AssetStatistics;
  lineage?: LineageInfo;
}

export interface ColumnMetadata {
  name: string;
  dataType: string;
  nullable: boolean;
  description?: string;
  businessName?: string;
  classification?: string;
  piiType?: 'email' | 'ssn' | 'credit_card' | 'phone' | 'name';
  sampleValues?: any[];
  statistics?: ColumnStatistics;
}

export interface AssetStatistics {
  rowCount: number;
  sizeBytes: number;
  lastModified: Date;
  lastAccessed: Date;
  queryCount: number;
  avgQueryTime: number;
}

export interface ColumnStatistics {
  distinctCount: number;
  nullCount: number;
  minValue?: any;
  maxValue?: any;
  avgLength?: number;
  topValues?: Array<{ value: any; count: number }>;
}

export interface LineageInfo {
  upstreamTables: string[];
  downstreamTables: string[];
  transformations: string[];
}

export class CatalogManager {
  constructor(private pool: Pool) {}

  /**
   * Register data asset in catalog
   */
  async registerAsset(asset: Omit<DataAsset, 'assetId'>): Promise<string> {
    const result = await this.pool.query(
      `
      INSERT INTO warehouse_catalog (
        name, type, schema, description, owner, tags, classification, columns, statistics, lineage
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING asset_id
    `,
      [
        asset.name,
        asset.type,
        asset.schema,
        asset.description,
        asset.owner,
        JSON.stringify(asset.tags || []),
        asset.classification || 'internal',
        JSON.stringify(asset.columns),
        JSON.stringify(asset.statistics || {}),
        JSON.stringify(asset.lineage || {}),
      ],
    );

    return result.rows[0].asset_id;
  }

  /**
   * Search catalog
   */
  async searchCatalog(query: string): Promise<DataAsset[]> {
    const result = await this.pool.query(
      `
      SELECT *
      FROM warehouse_catalog
      WHERE name ILIKE $1
         OR description ILIKE $1
         OR $1 = ANY(tags)
      ORDER BY name
      LIMIT 100
    `,
      [`%${query}%`],
    );

    return result.rows.map(this.mapToDataAsset);
  }

  /**
   * Get asset by name
   */
  async getAsset(name: string): Promise<DataAsset | null> {
    const result = await this.pool.query(
      `SELECT * FROM warehouse_catalog WHERE name = $1`,
      [name],
    );

    if (result.rows.length === 0) return null;

    return this.mapToDataAsset(result.rows[0]);
  }

  /**
   * Update asset statistics
   */
  async updateStatistics(assetId: string, statistics: AssetStatistics): Promise<void> {
    await this.pool.query(
      `
      UPDATE warehouse_catalog
      SET statistics = $2, updated_at = CURRENT_TIMESTAMP
      WHERE asset_id = $1
    `,
      [assetId, JSON.stringify(statistics)],
    );
  }

  /**
   * Add tags to asset
   */
  async addTags(assetId: string, tags: string[]): Promise<void> {
    await this.pool.query(
      `
      UPDATE warehouse_catalog
      SET tags = tags || $2::jsonb
      WHERE asset_id = $1
    `,
      [assetId, JSON.stringify(tags)],
    );
  }

  /**
   * Find assets by classification
   */
  async findByClassification(classification: string): Promise<DataAsset[]> {
    const result = await this.pool.query(
      `SELECT * FROM warehouse_catalog WHERE classification = $1`,
      [classification],
    );

    return result.rows.map(this.mapToDataAsset);
  }

  /**
   * Find assets containing PII
   */
  async findPIIAssets(): Promise<DataAsset[]> {
    const result = await this.pool.query(`
      SELECT *
      FROM warehouse_catalog
      WHERE columns::text LIKE '%"piiType"%'
    `);

    return result.rows.map(this.mapToDataAsset);
  }

  /**
   * Generate data dictionary
   */
  async generateDataDictionary(schema?: string): Promise<string> {
    const filter = schema ? `WHERE schema = '${schema}'` : '';

    const assets = await this.pool.query(`
      SELECT * FROM warehouse_catalog ${filter} ORDER BY name
    `);

    let markdown = '# Data Dictionary\n\n';

    for (const row of assets.rows) {
      const asset = this.mapToDataAsset(row);

      markdown += `## ${asset.name}\n\n`;
      markdown += `**Type:** ${asset.type}\n`;
      markdown += `**Schema:** ${asset.schema}\n`;
      if (asset.description) markdown += `**Description:** ${asset.description}\n`;
      if (asset.owner) markdown += `**Owner:** ${asset.owner}\n`;
      markdown += `**Classification:** ${asset.classification}\n\n`;

      markdown += '### Columns\n\n';
      markdown += '| Column | Type | Nullable | Description | PII |\n';
      markdown += '|--------|------|----------|-------------|-----|\n';

      for (const col of asset.columns) {
        markdown += `| ${col.name} | ${col.dataType} | ${col.nullable ? 'Yes' : 'No'} | ${col.description || '-'} | ${col.piiType || '-'} |\n`;
      }

      markdown += '\n';
    }

    return markdown;
  }

  /**
   * Initialize catalog tables
   */
  async initializeTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_catalog (
        asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        schema VARCHAR(255) NOT NULL,
        description TEXT,
        owner VARCHAR(255),
        tags JSONB DEFAULT '[]',
        classification VARCHAR(50) DEFAULT 'internal',
        columns JSONB NOT NULL,
        statistics JSONB DEFAULT '{}',
        lineage JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_catalog_name ON warehouse_catalog(name);
      CREATE INDEX IF NOT EXISTS idx_catalog_schema ON warehouse_catalog(schema);
      CREATE INDEX IF NOT EXISTS idx_catalog_classification ON warehouse_catalog(classification);
      CREATE INDEX IF NOT EXISTS idx_catalog_tags ON warehouse_catalog USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_catalog_columns ON warehouse_catalog USING GIN(columns);
    `);
  }

  private mapToDataAsset(row: any): DataAsset {
    return {
      assetId: row.asset_id,
      name: row.name,
      type: row.type,
      schema: row.schema,
      description: row.description,
      owner: row.owner,
      tags: JSON.parse(row.tags || '[]'),
      classification: row.classification,
      columns: JSON.parse(row.columns || '[]'),
      statistics: JSON.parse(row.statistics || '{}'),
      lineage: JSON.parse(row.lineage || '{}'),
    };
  }
}
