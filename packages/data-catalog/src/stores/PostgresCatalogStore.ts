/**
 * PostgreSQL Catalog Store Implementation
 * Database layer for catalog operations
 */

import { Pool, QueryResult } from 'pg';
import {
  AssetMetadata,
  AssetType,
  AssetStatus,
  SearchRequest,
  SearchResponse,
  AssetRelationship,
  RelationshipType,
  SearchFacet,
  FilterOperator,
} from '../types/catalog.js';
import { ICatalogStore } from '../services/CatalogService.js';

export class PostgresCatalogStore implements ICatalogStore {
  constructor(private pool: Pool) {}

  /**
   * Get asset by ID
   */
  async getAsset(id: string): Promise<AssetMetadata | null> {
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
   * Create new asset
   */
  async createAsset(asset: AssetMetadata): Promise<AssetMetadata> {
    const query = `
      INSERT INTO catalog_assets (
        id, type, name, display_name, description, fully_qualified_name,
        status, classification, owner, stewards, experts, tags, collections,
        domain, schema, properties, statistics, certification_level,
        endorsement_count, user_rating, usage_count, last_verified,
        verified_by, quality_overall, quality_completeness, quality_accuracy,
        quality_consistency, quality_timeliness, quality_validity,
        quality_uniqueness, created_at, updated_at, last_accessed_at,
        documentation, sample_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31, $32, $33, $34
      ) RETURNING *
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
      asset.schema ? JSON.stringify(asset.schema) : null,
      JSON.stringify(asset.properties),
      asset.statistics ? JSON.stringify(asset.statistics) : null,
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
      asset.sampleData ? JSON.stringify(asset.sampleData) : null,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToAsset(result.rows[0]);
  }

  /**
   * Update asset
   */
  async updateAsset(id: string, updates: Partial<AssetMetadata>): Promise<AssetMetadata> {
    const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [id];
    let paramIndex = 2;

    // Build dynamic SET clause
    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.displayName !== undefined) {
      setClauses.push(`display_name = $${paramIndex++}`);
      values.push(updates.displayName);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.classification !== undefined) {
      setClauses.push(`classification = $${paramIndex++}`);
      values.push(updates.classification);
    }
    if (updates.owner !== undefined) {
      setClauses.push(`owner = $${paramIndex++}`);
      values.push(updates.owner);
    }
    if (updates.stewards !== undefined) {
      setClauses.push(`stewards = $${paramIndex++}`);
      values.push(JSON.stringify(updates.stewards));
    }
    if (updates.experts !== undefined) {
      setClauses.push(`experts = $${paramIndex++}`);
      values.push(JSON.stringify(updates.experts));
    }
    if (updates.tags !== undefined) {
      setClauses.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.domain !== undefined) {
      setClauses.push(`domain = $${paramIndex++}`);
      values.push(updates.domain);
    }
    if (updates.properties !== undefined) {
      setClauses.push(`properties = $${paramIndex++}`);
      values.push(JSON.stringify(updates.properties));
    }
    if (updates.lastAccessedAt !== undefined) {
      setClauses.push(`last_accessed_at = $${paramIndex++}`);
      values.push(updates.lastAccessedAt);
    }

    const query = `
      UPDATE catalog_assets
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Asset ${id} not found`);
    }

    return this.mapRowToAsset(result.rows[0]);
  }

  /**
   * Delete asset
   */
  async deleteAsset(id: string): Promise<void> {
    await this.pool.query('DELETE FROM catalog_assets WHERE id = $1', [id]);
  }

  /**
   * Search assets
   */
  async searchAssets(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    let whereClauses: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Full-text search
    if (request.query) {
      whereClauses.push(`search_vector @@ plainto_tsquery('english', $${paramIndex++})`);
      params.push(request.query);
    }

    // Apply filters
    for (const filter of request.filters) {
      const clause = this.buildFilterClause(filter, paramIndex);
      if (clause) {
        whereClauses.push(clause.clause);
        params.push(...clause.params);
        paramIndex += clause.params.length;
      }
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Build ORDER BY clause
    const orderBy = request.sort.length > 0
      ? `ORDER BY ${request.sort.map(s => `${this.mapFieldToColumn(s.field)} ${s.direction}`).join(', ')}`
      : 'ORDER BY updated_at DESC';

    // Main query
    const query = `
      SELECT * FROM catalog_assets
      ${whereClause}
      ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(request.limit, request.offset);

    const result = await this.pool.query(query, params);

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total FROM catalog_assets
      ${whereClause}
    `;

    const countResult = await this.pool.query(countQuery, params.slice(0, params.length - 2));
    const total = parseInt(countResult.rows[0].total);

    // Get facets
    const facets = await this.getFacets(request, whereClauses, params.slice(0, params.length - 2));

    return {
      results: result.rows.map(row => this.mapRowToAsset(row)),
      facets,
      total,
      offset: request.offset,
      limit: request.limit,
      took: Date.now() - startTime,
    };
  }

  /**
   * List assets
   */
  async listAssets(type?: AssetType, status?: AssetStatus): Promise<AssetMetadata[]> {
    let query = 'SELECT * FROM catalog_assets';
    const params: any[] = [];
    const conditions: string[] = [];

    if (type) {
      conditions.push(`type = $${params.length + 1}`);
      params.push(type);
    }

    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY updated_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToAsset(row));
  }

  /**
   * Get asset relationships
   */
  async getRelationships(assetId: string): Promise<AssetRelationship[]> {
    const query = `
      SELECT * FROM catalog_relationships
      WHERE from_asset_id = $1 OR to_asset_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [assetId]);
    return result.rows.map(row => this.mapRowToRelationship(row));
  }

  /**
   * Create relationship
   */
  async createRelationship(relationship: AssetRelationship): Promise<AssetRelationship> {
    const query = `
      INSERT INTO catalog_relationships (
        id, from_asset_id, to_asset_id, relationship_type, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
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
    return this.mapRowToRelationship(result.rows[0]);
  }

  /**
   * Build filter clause for SQL
   */
  private buildFilterClause(filter: any, startIndex: number): { clause: string; params: any[] } | null {
    const column = this.mapFieldToColumn(filter.field);
    const params: any[] = [];

    switch (filter.operator) {
      case FilterOperator.EQUALS:
        return { clause: `${column} = $${startIndex}`, params: [filter.value] };

      case FilterOperator.NOT_EQUALS:
        return { clause: `${column} != $${startIndex}`, params: [filter.value] };

      case FilterOperator.CONTAINS:
        return { clause: `${column} ILIKE $${startIndex}`, params: [`%${filter.value}%`] };

      case FilterOperator.STARTS_WITH:
        return { clause: `${column} ILIKE $${startIndex}`, params: [`${filter.value}%`] };

      case FilterOperator.ENDS_WITH:
        return { clause: `${column} ILIKE $${startIndex}`, params: [`%${filter.value}`] };

      case FilterOperator.IN:
        return { clause: `${column} = ANY($${startIndex})`, params: [filter.value] };

      case FilterOperator.NOT_IN:
        return { clause: `${column} != ALL($${startIndex})`, params: [filter.value] };

      case FilterOperator.GREATER_THAN:
        return { clause: `${column} > $${startIndex}`, params: [filter.value] };

      case FilterOperator.LESS_THAN:
        return { clause: `${column} < $${startIndex}`, params: [filter.value] };

      default:
        return null;
    }
  }

  /**
   * Get facets for search
   */
  private async getFacets(request: SearchRequest, whereClauses: string[], params: any[]): Promise<SearchFacet[]> {
    const facets: SearchFacet[] = [];
    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    for (const facetField of request.facets) {
      const column = this.mapFieldToColumn(facetField);

      const query = `
        SELECT ${column} as value, COUNT(*) as count
        FROM catalog_assets
        ${whereClause}
        GROUP BY ${column}
        ORDER BY count DESC
        LIMIT 20
      `;

      const result = await this.pool.query(query, params);

      facets.push({
        field: facetField,
        values: result.rows.map(row => ({
          value: row.value,
          count: parseInt(row.count),
          selected: false,
        })),
      });
    }

    return facets;
  }

  /**
   * Map field name to database column
   */
  private mapFieldToColumn(field: string): string {
    const mapping: Record<string, string> = {
      type: 'type',
      status: 'status',
      owner: 'owner',
      domain: 'domain',
      classification: 'classification',
      certificationLevel: 'certification_level',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };

    return mapping[field] || field;
  }

  /**
   * Map database row to AssetMetadata
   */
  private mapRowToAsset(row: any): AssetMetadata {
    return {
      id: row.id,
      type: row.type as AssetType,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      fullyQualifiedName: row.fully_qualified_name,
      status: row.status as AssetStatus,
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
        userRating: row.user_rating,
        usageCount: row.usage_count,
        lastVerified: row.last_verified,
        verifiedBy: row.verified_by,
        qualityScore: {
          overall: row.quality_overall,
          completeness: row.quality_completeness,
          accuracy: row.quality_accuracy,
          consistency: row.quality_consistency,
          timeliness: row.quality_timeliness,
          validity: row.quality_validity,
          uniqueness: row.quality_uniqueness,
        },
      },
      schema: row.schema,
      properties: row.properties || {},
      statistics: row.statistics,
      upstreamAssets: [],
      downstreamAssets: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastAccessedAt: row.last_accessed_at,
      documentation: row.documentation,
      sampleData: row.sample_data,
      accessControlList: [],
    };
  }

  /**
   * Map database row to AssetRelationship
   */
  private mapRowToRelationship(row: any): AssetRelationship {
    return {
      id: row.id,
      fromAssetId: row.from_asset_id,
      toAssetId: row.to_asset_id,
      relationshipType: row.relationship_type as RelationshipType,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    };
  }
}
