
import { getPostgresPool } from '../../db/postgres.js';
import { DataAsset, DataAssetType, SchemaDefinition } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export class DataCatalogService {
  private static instance: DataCatalogService;

  private constructor() { }

  static getInstance(): DataCatalogService {
    if (!DataCatalogService.instance) {
      DataCatalogService.instance = new DataCatalogService();
    }
    return DataCatalogService.instance;
  }

  async registerAsset(asset: Omit<DataAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataAsset> {
    const pool = getPostgresPool();
    const id = uuidv4();
    const now = new Date();

    const newAsset: DataAsset = {
      ...asset,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await pool.query(
      `INSERT INTO data_catalog_assets (
        id, urn, name, description, type, source, schema, owners, tags, sensitivity, metadata, tenant_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        newAsset.id,
        newAsset.urn,
        newAsset.name,
        newAsset.description,
        newAsset.type,
        newAsset.source,
        JSON.stringify(newAsset.schema),
        newAsset.owners,
        newAsset.tags,
        newAsset.sensitivity,
        JSON.stringify(newAsset.metadata),
        newAsset.tenantId,
        newAsset.createdAt,
        newAsset.updatedAt,
      ]
    );

    return newAsset;
  }

  async getAsset(id: string): Promise<DataAsset | null> {
    const pool = getPostgresPool();
    const result = await pool.query('SELECT * FROM data_catalog_assets WHERE id = $1', [id]);

    if (result.rows.length === 0) return null;
    return this.mapRowToAsset(result.rows[0]);
  }

  async getAssetByUrn(urn: string): Promise<DataAsset | null> {
    const pool = getPostgresPool();
    const result = await pool.query('SELECT * FROM data_catalog_assets WHERE urn = $1', [urn]);

    if (result.rows.length === 0) return null;
    return this.mapRowToAsset(result.rows[0]);
  }

  async searchAssets(tenantId: string, query: string): Promise<DataAsset[]> {
    const pool = getPostgresPool();
    const likeQuery = `%${query}%`;
    const result = await pool.query(
      `SELECT * FROM data_catalog_assets
       WHERE tenant_id = $1 AND (name ILIKE $2 OR description ILIKE $2 OR urn ILIKE $2)`,
      [tenantId, likeQuery]
    );

    return result.rows.map(this.mapRowToAsset);
  }

  async updateAsset(id: string, updates: Partial<DataAsset>): Promise<DataAsset | null> {
    const pool = getPostgresPool();
    const current = await this.getAsset(id);
    if (!current) return null;

    const updated = { ...current, ...updates, updatedAt: new Date() };

    await pool.query(
      `UPDATE data_catalog_assets SET
        name = $1, description = $2, schema = $3, owners = $4, tags = $5,
        sensitivity = $6, metadata = $7, updated_at = $8
       WHERE id = $9`,
      [
        updated.name,
        updated.description,
        JSON.stringify(updated.schema),
        updated.owners,
        updated.tags,
        updated.sensitivity,
        JSON.stringify(updated.metadata),
        updated.updatedAt,
        id
      ]
    );

    return updated;
  }

  private mapRowToAsset(row: any): DataAsset {
    return {
      id: row.id,
      urn: row.urn,
      name: row.name,
      description: row.description,
      type: row.type as DataAssetType,
      source: row.source,
      schema: row.schema as SchemaDefinition,
      owners: row.owners,
      tags: row.tags,
      sensitivity: row.sensitivity,
      metadata: row.metadata,
      tenantId: row.tenant_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
