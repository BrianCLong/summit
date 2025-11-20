/**
 * PostgreSQL Catalog Store Implementation
 * Database-backed storage for catalog assets
 */

import { Pool } from 'pg';
import {
  AssetMetadata,
  AssetType,
  AssetStatus,
  SearchRequest,
  SearchResponse,
  AssetRelationship,
  SearchFacet,
  FacetValue,
} from '../types/catalog.js';
import { ICatalogStore } from '../services/CatalogService.js';

export class PostgresCatalogStore implements ICatalogStore {
  constructor(private pool: Pool) {}

  /**
   * Get asset by ID
   */
  async getAsset(id: string): Promise<AssetMetadata | null> {
    const query = `
      SELECT *
      FROM catalog_assets
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAsset(result.rows[0]);
  }

  /**
   * Create asset
   */
  async createAsset(asset: AssetMetadata): Promise<AssetMetadata> {
    const query = `
      INSERT INTO catalog_assets (
        id, type, name, display_name, description, fully_qualified_name,
        status, classification, owner, stewards, experts, tags, collections,
        domain, schema, properties, statistics, certification_level,
        endorsement_count, user_rating, usage_count, last_verified, verified_by,
        quality_overall, quality_completeness, quality_accuracy, quality_consistency,
        quality_timeliness, quality_validity, quality_uniqueness,
        created_at, updated_at, last_accessed_at, documentation, sample_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35
      )
      RETURNING *
    `;

    const values = [
      asset.id,
      asset.type,
      asset.name,
      asset.displayName,
      asset.description,
      asset.fullyQualifiedName,
      asset.status,
      asset.classification,
      asset.owner,
      JSON.stringify(asset.stewards),
      JSON.stringify(asset.experts),
      JSON.stringify(asset.tags),
      JSON.stringify(asset.collections),
      asset.domain,
      JSON.stringify(asset.schema),
      JSON.stringify(asset.properties),
      JSON.stringify(asset.statistics),
      asset.trustIndicators.certificationLevel,
      asset.trustIndicators.endorsementCount,
      asset.trustIndicators.userRating,
      asset.trustIndicators.usageCount,
      asset.trustIndicators.lastVerified,
      asset.trustIndicators.verifiedBy,
      asset.trustIndicators.qualityScore.overall,
      asset.trustIndicators.qualityScore.completeness,
      asset.trustIndicators.qualityScore.accuracy,
      asset.trustIndicators.qualityScore.consistency,
      asset.trustIndicators.qualityScore.timeliness,
      asset.trustIndicators.qualityScore.validity,
      asset.trustIndicators.qualityScore.uniqueness,
      asset.createdAt,
      asset.updatedAt,
      asset.lastAccessedAt,
      asset.documentation,
      JSON.stringify(asset.sampleData),
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToAsset(result.rows[0]);
  }

  /**
   * Update asset
   */
  async updateAsset(id: string, updates: Partial<AssetMetadata>): Promise<AssetMetadata> {
    // Build dynamic update query
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMapping: Record<string, string> = {
      name: 'name',
      displayName: 'display_name',
      description: 'description',
      status: 'status',
      classification: 'classification',
      owner: 'owner',
      domain: 'domain',
      documentation: 'documentation',
      updatedAt: 'updated_at',
      lastAccessedAt: 'last_accessed_at',
    };

    const jsonFields = ['stewards', 'experts', 'tags', 'collections', 'schema', 'properties', 'statistics', 'sampleData'];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbField = fieldMapping[key] || key;

        if (jsonFields.includes(key)) {
          setClauses.push(`${dbField} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          setClauses.push(`${dbField} = $${paramIndex}`);
          values.push(value);
        }

        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      // No updates, just return current asset
      return (await this.getAsset(id))!;
    }

    values.push(id);
    const query = `
      UPDATE catalog_assets
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return this.mapRowToAsset(result.rows[0]);
  }

  /**
   * Delete asset
   */
  async deleteAsset(id: string): Promise<void> {
    const query = 'DELETE FROM catalog_assets WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  /**
   * Search assets
   */
  async searchAssets(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();

    // Build search query
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Full-text search
    if (request.query) {
      whereClause += ` AND search_vector @@ plainto_tsquery('english', $${paramIndex})`;
      params.push(request.query);
      paramIndex++;
    }

    // Apply filters
    for (const filter of request.filters) {
      switch (filter.operator) {
        case 'EQUALS':
          whereClause += ` AND ${filter.field} = $${paramIndex}`;
          params.push(filter.value);
          paramIndex++;
          break;
        case 'IN':
          whereClause += ` AND ${filter.field} = ANY($${paramIndex})`;
          params.push(filter.value);
          paramIndex++;
          break;
        case 'CONTAINS':
          whereClause += ` AND ${filter.field} ILIKE $${paramIndex}`;
          params.push(`%${filter.value}%`);
          paramIndex++;
          break;
        case 'GREATER_THAN':
          whereClause += ` AND ${filter.field} > $${paramIndex}`;
          params.push(filter.value);
          paramIndex++;
          break;
      }
    }

    // Build sort clause
    const sortClause = request.sort.length > 0
      ? `ORDER BY ${request.sort.map((s) => `${s.field} ${s.direction}`).join(', ')}`
      : 'ORDER BY updated_at DESC';

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM catalog_assets ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get results
    const query = `
      SELECT *
      FROM catalog_assets
      ${whereClause}
      ${sortClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(request.limit, request.offset);

    const result = await this.pool.query(query, params);
    const results = result.rows.map((row) => this.mapRowToAsset(row));

    // Build facets
    const facets = await this.buildFacets(request.facets, whereClause, params.slice(0, -2));

    return {
      results,
      facets,
      total,
      offset: request.offset,
      limit: request.limit,
      took: Date.now() - startTime,
    };
  }

  /**
   * List assets by type and status
   */
  async listAssets(type?: AssetType, status?: AssetStatus): Promise<AssetMetadata[]> {
    let query = 'SELECT * FROM catalog_assets WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY updated_at DESC LIMIT 100';

    const result = await this.pool.query(query, params);
    return result.rows.map((row) => this.mapRowToAsset(row));
  }

  /**
   * Get asset relationships
   */
  async getRelationships(assetId: string): Promise<AssetRelationship[]> {
    const query = `
      SELECT *
      FROM catalog_relationships
      WHERE from_asset_id = $1 OR to_asset_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [assetId]);

    return result.rows.map((row) => ({
      id: row.id,
      fromAssetId: row.from_asset_id,
      toAssetId: row.to_asset_id,
      relationshipType: row.relationship_type,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  }

  /**
   * Create relationship
   */
  async createRelationship(relationship: AssetRelationship): Promise<AssetRelationship> {
    const query = `
      INSERT INTO catalog_relationships (
        id, from_asset_id, to_asset_id, relationship_type, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (from_asset_id, to_asset_id, relationship_type)
      DO UPDATE SET metadata = $5
      RETURNING *
    `;

    const values = [
      relationship.id,
      relationship.fromAssetId,
      relationship.toAssetId,
      relationship.relationshipType,
      JSON.stringify(relationship.metadata),
      relationship.createdAt,
    ];

    const result = await this.pool.query(query, values);

    return {
      id: result.rows[0].id,
      fromAssetId: result.rows[0].from_asset_id,
      toAssetId: result.rows[0].to_asset_id,
      relationshipType: result.rows[0].relationship_type,
      metadata: result.rows[0].metadata,
      createdAt: result.rows[0].created_at,
    };
  }

  /**
   * Build facets for search results
   */
  private async buildFacets(
    facetFields: string[],
    whereClause: string,
    params: any[]
  ): Promise<SearchFacet[]> {
    const facets: SearchFacet[] = [];

    for (const field of facetFields) {
      const query = `
        SELECT ${field} as value, COUNT(*) as count
        FROM catalog_assets
        ${whereClause}
        GROUP BY ${field}
        ORDER BY count DESC
        LIMIT 20
      `;

      const result = await this.pool.query(query, params);

      const values: FacetValue[] = result.rows.map((row) => ({
        value: row.value,
        count: parseInt(row.count, 10),
        selected: false,
      }));

      facets.push({
        field,
        values,
      });
    }

    return facets;
  }

  /**
   * Map database row to AssetMetadata
   */
  private mapRowToAsset(row: any): AssetMetadata {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      fullyQualifiedName: row.fully_qualified_name,
      status: row.status,
      classification: row.classification,
      owner: row.owner,
      stewards: row.stewards || [],
      experts: row.experts || [],
      tags: row.tags || [],
      collections: row.collections || [],
      domain: row.domain,
      trustIndicators: {
        certificationLevel: row.certification_level,
        endorsementCount: row.endorsement_count,
        userRating: parseFloat(row.user_rating),
        usageCount: row.usage_count,
        lastVerified: row.last_verified,
        verifiedBy: row.verified_by,
        qualityScore: {
          overall: parseFloat(row.quality_overall),
          completeness: parseFloat(row.quality_completeness),
          accuracy: parseFloat(row.quality_accuracy),
          consistency: parseFloat(row.quality_consistency),
          timeliness: parseFloat(row.quality_timeliness),
          validity: parseFloat(row.quality_validity),
          uniqueness: parseFloat(row.quality_uniqueness),
        },
      },
      schema: row.schema,
      properties: row.properties || {},
      statistics: row.statistics,
      upstreamAssets: [], // Would be populated from relationships
      downstreamAssets: [], // Would be populated from relationships
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastAccessedAt: row.last_accessed_at,
      documentation: row.documentation,
      sampleData: row.sample_data || [],
      accessControlList: [], // Would be populated from separate table
    };
  }
}
