/**
 * Metadata Search Service
 * Provides advanced search capabilities across catalog metadata
 */

import { Pool } from 'pg';
import {
  DataSource,
  Dataset,
  Field,
  Mapping,
  License,
} from '../types/metadata.js';

export interface SearchQuery {
  query?: string;
  filters?: SearchFilter[];
  sort?: SortOption[];
  offset?: number;
  limit?: number;
}

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'gt' | 'lt' | 'between';
  value: any;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchResult<T> {
  results: T[];
  total: number;
  offset: number;
  limit: number;
  took: number;
  facets?: SearchFacet[];
}

export interface SearchFacet {
  field: string;
  values: Array<{ value: string; count: number }>;
}

export class MetadataSearchService {
  constructor(private pool: Pool) {}

  /**
   * Search data sources
   */
  async searchDataSources(query: SearchQuery): Promise<SearchResult<DataSource>> {
    const startTime = Date.now();

    let sql = 'SELECT * FROM catalog_data_sources';
    const params: any[] = [];
    const whereClauses: string[] = [];
    let paramIndex = 1;

    // Full-text search
    if (query.query) {
      whereClauses.push(
        `to_tsvector('english', name || ' ' || coalesce(description, '')) @@ plainto_tsquery('english', $${paramIndex++})`
      );
      params.push(query.query);
    }

    // Apply filters
    if (query.filters) {
      for (const filter of query.filters) {
        const clause = this.buildFilterClause(filter, paramIndex);
        if (clause) {
          whereClauses.push(clause.sql);
          params.push(...clause.params);
          paramIndex += clause.params.length;
        }
      }
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Sort
    const orderBy = this.buildOrderBy(query.sort || [{ field: 'updated_at', direction: 'desc' }]);
    sql += ` ${orderBy}`;

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.pool.query(sql, params);

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM catalog_data_sources ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}`;
    const countResult = await this.pool.query(countSql, params.slice(0, params.length - 2));
    const total = parseInt(countResult.rows[0].total);

    return {
      results: result.rows.map(row => this.mapRowToDataSource(row)),
      total,
      offset,
      limit,
      took: Date.now() - startTime,
    };
  }

  /**
   * Search datasets
   */
  async searchDatasets(query: SearchQuery): Promise<SearchResult<Dataset>> {
    const startTime = Date.now();

    let sql = 'SELECT * FROM catalog_datasets';
    const params: any[] = [];
    const whereClauses: string[] = [];
    let paramIndex = 1;

    // Full-text search
    if (query.query) {
      whereClauses.push(
        `to_tsvector('english', name || ' ' || coalesce(description, '')) @@ plainto_tsquery('english', $${paramIndex++})`
      );
      params.push(query.query);
    }

    // Apply filters
    if (query.filters) {
      for (const filter of query.filters) {
        const clause = this.buildFilterClause(filter, paramIndex);
        if (clause) {
          whereClauses.push(clause.sql);
          params.push(...clause.params);
          paramIndex += clause.params.length;
        }
      }
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Sort
    const orderBy = this.buildOrderBy(query.sort || [{ field: 'updated_at', direction: 'desc' }]);
    sql += ` ${orderBy}`;

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.pool.query(sql, params);

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM catalog_datasets ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}`;
    const countResult = await this.pool.query(countSql, params.slice(0, params.length - 2));
    const total = parseInt(countResult.rows[0].total);

    return {
      results: result.rows.map(row => this.mapRowToDataset(row)),
      total,
      offset,
      limit,
      took: Date.now() - startTime,
    };
  }

  /**
   * Search fields
   */
  async searchFields(query: SearchQuery): Promise<SearchResult<Field>> {
    const startTime = Date.now();

    let sql = 'SELECT * FROM catalog_fields';
    const params: any[] = [];
    const whereClauses: string[] = [];
    let paramIndex = 1;

    // Full-text search
    if (query.query) {
      whereClauses.push(
        `to_tsvector('english', name || ' ' || coalesce(description, '')) @@ plainto_tsquery('english', $${paramIndex++})`
      );
      params.push(query.query);
    }

    // Apply filters
    if (query.filters) {
      for (const filter of query.filters) {
        const clause = this.buildFilterClause(filter, paramIndex);
        if (clause) {
          whereClauses.push(clause.sql);
          params.push(...clause.params);
          paramIndex += clause.params.length;
        }
      }
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Sort
    const orderBy = this.buildOrderBy(query.sort || [{ field: 'name', direction: 'asc' }]);
    sql += ` ${orderBy}`;

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.pool.query(sql, params);

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM catalog_fields ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}`;
    const countResult = await this.pool.query(countSql, params.slice(0, params.length - 2));
    const total = parseInt(countResult.rows[0].total);

    return {
      results: result.rows.map(row => this.mapRowToField(row)),
      total,
      offset,
      limit,
      took: Date.now() - startTime,
    };
  }

  /**
   * Search by canonical field mapping
   */
  async searchFieldsByCanonicalName(canonicalFieldName: string): Promise<Field[]> {
    const sql = `
      SELECT * FROM catalog_fields
      WHERE canonical_field_name = $1
      ORDER BY dataset_id, name
    `;

    const result = await this.pool.query(sql, [canonicalFieldName]);
    return result.rows.map(row => this.mapRowToField(row));
  }

  /**
   * Search mappings
   */
  async searchMappings(query: SearchQuery): Promise<SearchResult<Mapping>> {
    const startTime = Date.now();

    let sql = 'SELECT * FROM catalog_mappings';
    const params: any[] = [];
    const whereClauses: string[] = [];
    let paramIndex = 1;

    // Full-text search
    if (query.query) {
      whereClauses.push(
        `to_tsvector('english', name || ' ' || coalesce(description, '')) @@ plainto_tsquery('english', $${paramIndex++})`
      );
      params.push(query.query);
    }

    // Apply filters
    if (query.filters) {
      for (const filter of query.filters) {
        const clause = this.buildFilterClause(filter, paramIndex);
        if (clause) {
          whereClauses.push(clause.sql);
          params.push(...clause.params);
          paramIndex += clause.params.length;
        }
      }
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Sort
    const orderBy = this.buildOrderBy(query.sort || [{ field: 'updated_at', direction: 'desc' }]);
    sql += ` ${orderBy}`;

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.pool.query(sql, params);

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM catalog_mappings ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}`;
    const countResult = await this.pool.query(countSql, params.slice(0, params.length - 2));
    const total = parseInt(countResult.rows[0].total);

    return {
      results: result.rows.map(row => this.mapRowToMapping(row)),
      total,
      offset,
      limit,
      took: Date.now() - startTime,
    };
  }

  /**
   * Get facets for datasets
   */
  async getDatasetFacets(): Promise<SearchFacet[]> {
    const facets: SearchFacet[] = [];

    // Source type facet
    const sourceTypeSql = `
      SELECT type as value, COUNT(*) as count
      FROM catalog_datasets
      GROUP BY type
      ORDER BY count DESC
    `;
    const sourceTypeResult = await this.pool.query(sourceTypeSql);
    facets.push({
      field: 'type',
      values: sourceTypeResult.rows.map(row => ({
        value: row.value,
        count: parseInt(row.count),
      })),
    });

    // Owner facet
    const ownerSql = `
      SELECT owner as value, COUNT(*) as count
      FROM catalog_datasets
      GROUP BY owner
      ORDER BY count DESC
      LIMIT 20
    `;
    const ownerResult = await this.pool.query(ownerSql);
    facets.push({
      field: 'owner',
      values: ownerResult.rows.map(row => ({
        value: row.value,
        count: parseInt(row.count),
      })),
    });

    return facets;
  }

  /**
   * Search across all metadata (universal search)
   */
  async universalSearch(queryText: string, limit: number = 10): Promise<{
    dataSources: DataSource[];
    datasets: Dataset[];
    fields: Field[];
    mappings: Mapping[];
  }> {
    const query: SearchQuery = {
      query: queryText,
      limit,
    };

    const [dataSources, datasets, fields, mappings] = await Promise.all([
      this.searchDataSources(query),
      this.searchDatasets(query),
      this.searchFields(query),
      this.searchMappings(query),
    ]);

    return {
      dataSources: dataSources.results,
      datasets: datasets.results,
      fields: fields.results,
      mappings: mappings.results,
    };
  }

  /**
   * Find datasets by license or policy tag
   */
  async findDatasetsByPolicy(criteria: {
    licenseId?: string;
    policyTags?: string[];
  }): Promise<Dataset[]> {
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.licenseId) {
      whereClauses.push(`license_id = $${paramIndex++}`);
      params.push(criteria.licenseId);
    }

    if (criteria.policyTags && criteria.policyTags.length > 0) {
      whereClauses.push(`policy_tags ?| $${paramIndex++}`);
      params.push(criteria.policyTags);
    }

    const sql = `
      SELECT * FROM catalog_datasets
      ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
      ORDER BY updated_at DESC
    `;

    const result = await this.pool.query(sql, params);
    return result.rows.map(row => this.mapRowToDataset(row));
  }

  // ====== Private Helper Methods ======

  private buildFilterClause(
    filter: SearchFilter,
    startIndex: number
  ): { sql: string; params: any[] } | null {
    const column = this.mapFieldToColumn(filter.field);
    const params: any[] = [];

    switch (filter.operator) {
      case 'equals':
        return { sql: `${column} = $${startIndex}`, params: [filter.value] };

      case 'contains':
        return { sql: `${column} ILIKE $${startIndex}`, params: [`%${filter.value}%`] };

      case 'in':
        return { sql: `${column} = ANY($${startIndex})`, params: [filter.value] };

      case 'gt':
        return { sql: `${column} > $${startIndex}`, params: [filter.value] };

      case 'lt':
        return { sql: `${column} < $${startIndex}`, params: [filter.value] };

      case 'between':
        if (Array.isArray(filter.value) && filter.value.length === 2) {
          return {
            sql: `${column} BETWEEN $${startIndex} AND $${startIndex + 1}`,
            params: [filter.value[0], filter.value[1]],
          };
        }
        return null;

      default:
        return null;
    }
  }

  private buildOrderBy(sortOptions: SortOption[]): string {
    if (sortOptions.length === 0) {
      return '';
    }

    const orderClauses = sortOptions.map(opt => {
      const column = this.mapFieldToColumn(opt.field);
      return `${column} ${opt.direction.toUpperCase()}`;
    });

    return `ORDER BY ${orderClauses.join(', ')}`;
  }

  private mapFieldToColumn(field: string): string {
    const mapping: Record<string, string> = {
      type: 'type',
      name: 'name',
      owner: 'owner',
      status: 'status',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      sourceId: 'source_id',
      datasetId: 'dataset_id',
      licenseId: 'license_id',
      canonicalEntityType: 'canonical_entity_type',
      dataType: 'data_type',
      sensitivityLevel: 'sensitivity_level',
    };

    return mapping[field] || field;
  }

  // Mapping functions
  private mapRowToDataSource(row: any): DataSource {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      type: row.type,
      connectorId: row.connector_id,
      connectorVersion: row.connector_version,
      connectionConfig: row.connection_config || {},
      connectionStatus: row.connection_status,
      lastConnectedAt: row.last_connected_at,
      lastSyncedAt: row.last_synced_at,
      owner: row.owner,
      team: row.team,
      tags: row.tags || [],
      properties: row.properties || {},
      schemaId: row.schema_id,
      schemaVersion: row.schema_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }

  private mapRowToDataset(row: any): Dataset {
    return {
      id: row.id,
      sourceId: row.source_id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      fullyQualifiedName: row.fully_qualified_name,
      datasetType: row.dataset_type,
      schemaId: row.schema_id,
      schemaVersion: row.schema_version,
      fields: [],
      canonicalMappingId: row.canonical_mapping_id,
      canonicalMappingVersion: row.canonical_mapping_version,
      licenseId: row.license_id,
      policyTags: row.policy_tags || [],
      retentionDays: row.retention_days,
      legalBasis: row.legal_basis,
      rowCount: row.row_count,
      sizeBytes: row.size_bytes,
      lastProfiledAt: row.last_profiled_at,
      qualityScore: row.quality_score,
      owner: row.owner,
      stewards: row.stewards || [],
      tags: row.tags || [],
      properties: row.properties || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastAccessedAt: row.last_accessed_at,
    };
  }

  private mapRowToField(row: any): Field {
    return {
      id: row.id,
      datasetId: row.dataset_id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      dataType: row.data_type,
      semanticType: row.semantic_type,
      nullable: row.nullable,
      isPrimaryKey: row.is_primary_key,
      isForeignKey: row.is_foreign_key,
      foreignKeyRef: row.foreign_key_ref,
      canonicalFieldName: row.canonical_field_name,
      transformationLogic: row.transformation_logic,
      policyTags: row.policy_tags || [],
      sensitivityLevel: row.sensitivity_level,
      statistics: row.statistics,
      tags: row.tags || [],
      properties: row.properties || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToMapping(row: any): Mapping {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      sourceId: row.source_id,
      datasetId: row.dataset_id,
      sourceSchemaId: row.source_schema_id,
      sourceSchemaVersion: row.source_schema_version,
      canonicalSchemaId: row.canonical_schema_id,
      canonicalSchemaVersion: row.canonical_schema_version,
      canonicalEntityType: row.canonical_entity_type,
      fieldMappings: [],
      transformationRules: [],
      status: row.status,
      validatedAt: row.validated_at,
      validatedBy: row.validated_by,
      version: row.version,
      previousVersionId: row.previous_version_id,
      tags: row.tags || [],
      properties: row.properties || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }
}
