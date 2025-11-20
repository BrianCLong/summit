/**
 * Search Engine
 * Advanced search and discovery interface for the data catalog
 * Supports full-text search, faceted search, and semantic search
 */

import { Pool } from 'pg';
import {
  SearchQuery,
  SearchResult,
  SearchResults,
  DataAsset,
  AssetType,
  DataClassification,
  BusinessTerm,
} from '../types.js';

/**
 * Search engine configuration
 */
export interface SearchEngineConfig {
  /** Database connection pool */
  pool: Pool;
  /** Enable semantic search */
  enableSemanticSearch?: boolean;
  /** Default page size */
  defaultPageSize?: number;
  /** Maximum page size */
  maxPageSize?: number;
  /** Enable search result caching */
  enableCache?: boolean;
  /** Cache TTL in seconds */
  cacheTTL?: number;
}

/**
 * Search ranking configuration
 */
interface RankingConfig {
  /** Weight for exact name match */
  nameMatchWeight: number;
  /** Weight for description match */
  descriptionMatchWeight: number;
  /** Weight for tag match */
  tagMatchWeight: number;
  /** Weight for business term match */
  termMatchWeight: number;
  /** Boost for certified assets */
  certifiedBoost: number;
  /** Boost based on usage statistics */
  usageBoost: number;
}

/**
 * Search Engine
 * Provides advanced search capabilities for the data catalog
 */
export class SearchEngine {
  private pool: Pool;
  private config: SearchEngineConfig;
  private rankingConfig: RankingConfig;
  private searchCache: Map<string, { results: SearchResults; timestamp: number }>;

  constructor(config: SearchEngineConfig) {
    this.pool = config.pool;
    this.config = {
      enableSemanticSearch: config.enableSemanticSearch ?? false,
      defaultPageSize: config.defaultPageSize ?? 20,
      maxPageSize: config.maxPageSize ?? 100,
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL ?? 300, // 5 minutes
    };

    this.rankingConfig = {
      nameMatchWeight: 3.0,
      descriptionMatchWeight: 1.0,
      tagMatchWeight: 2.0,
      termMatchWeight: 2.5,
      certifiedBoost: 1.5,
      usageBoost: 1.2,
    };

    this.searchCache = new Map();
  }

  /**
   * Initialize search engine
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Enable pg_trgm extension for fuzzy search
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS pg_trgm;
        CREATE EXTENSION IF NOT EXISTS unaccent;
      `);

      // Create materialized view for search optimization
      await client.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS catalog_search_index AS
        SELECT
          a.id,
          a.name,
          a.display_name,
          a.type,
          a.description,
          a.classification,
          a.status,
          a.source,
          a.owner,
          a.tags,
          a.business_terms,
          a.certified,
          a.usage_stats,
          a.updated_at,
          to_tsvector('english',
            a.name || ' ' ||
            a.display_name || ' ' ||
            COALESCE(a.description, '') || ' ' ||
            COALESCE(array_to_string(a.business_terms, ' '), '')
          ) as search_vector
        FROM catalog_assets a
        WHERE a.status = 'ACTIVE';

        CREATE INDEX IF NOT EXISTS idx_search_vector ON catalog_search_index USING gin(search_vector);
        CREATE INDEX IF NOT EXISTS idx_search_type ON catalog_search_index(type);
        CREATE INDEX IF NOT EXISTS idx_search_classification ON catalog_search_index(classification);
      `);

      console.log('Search engine initialized successfully');
    } finally {
      client.release();
    }
  }

  /**
   * Refresh search index
   */
  async refreshIndex(): Promise<void> {
    await this.pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY catalog_search_index');
    this.clearCache();
  }

  /**
   * Search for data assets
   */
  async search(query: SearchQuery): Promise<SearchResults> {
    const startTime = Date.now();

    // Check cache
    if (this.config.enableCache) {
      const cacheKey = this.getCacheKey(query);
      const cached = this.searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL! * 1000) {
        return cached.results;
      }
    }

    // Validate and normalize pagination
    const page = query.pagination?.page || 1;
    const pageSize = Math.min(
      query.pagination?.pageSize || this.config.defaultPageSize!,
      this.config.maxPageSize!
    );
    const offset = (page - 1) * pageSize;

    // Build search query
    const { sql, params } = this.buildSearchSQL(query, pageSize, offset);

    // Execute search
    const result = await this.pool.query(sql, params);

    // Build search results
    const searchResults: SearchResult[] = result.rows.map((row) => ({
      asset: this.mapRowToAsset(row),
      score: parseFloat(row.rank_score || '0'),
      highlights: this.extractHighlights(row, query.query),
      matchedTerms: row.matched_terms || [],
    }));

    // Get total count
    const countSQL = this.buildCountSQL(query);
    const countResult = await this.pool.query(countSQL.sql, countSQL.params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get facets
    const facets = await this.buildFacets(query);

    const results: SearchResults = {
      results: searchResults,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      executionTime: Date.now() - startTime,
      facets,
    };

    // Cache results
    if (this.config.enableCache) {
      const cacheKey = this.getCacheKey(query);
      this.searchCache.set(cacheKey, { results, timestamp: Date.now() });
    }

    return results;
  }

  /**
   * Suggest search terms based on partial input
   */
  async suggest(partial: string, limit: number = 10): Promise<string[]> {
    const result = await this.pool.query(
      `
      SELECT DISTINCT name, similarity(name, $1) as sim
      FROM catalog_assets
      WHERE name % $1
      ORDER BY sim DESC, name
      LIMIT $2
    `,
      [partial, limit]
    );

    return result.rows.map((row) => row.name);
  }

  /**
   * Search for similar assets based on an existing asset
   */
  async findSimilar(assetId: string, limit: number = 10): Promise<SearchResult[]> {
    // Get the source asset
    const assetResult = await this.pool.query(
      'SELECT * FROM catalog_assets WHERE id = $1',
      [assetId]
    );

    if (assetResult.rows.length === 0) {
      return [];
    }

    const sourceAsset = this.mapRowToAsset(assetResult.rows[0]);

    // Build similarity query based on tags, type, and business terms
    const result = await this.pool.query(
      `
      SELECT
        a.*,
        (
          -- Type similarity
          CASE WHEN a.type = $2 THEN 2.0 ELSE 0.0 END +
          -- Tag similarity
          (SELECT COUNT(*) FROM unnest(a.tags) tag WHERE tag::jsonb->>'key' = ANY($3)) * 0.5 +
          -- Business term similarity
          (SELECT COUNT(*) FROM unnest(a.business_terms) term WHERE term = ANY($4)) * 1.0 +
          -- Owner similarity
          CASE WHEN a.owner = $5 THEN 0.5 ELSE 0.0 END
        ) as similarity_score
      FROM catalog_assets a
      WHERE a.id != $1
        AND a.status = 'ACTIVE'
      ORDER BY similarity_score DESC
      LIMIT $6
    `,
      [
        assetId,
        sourceAsset.type,
        sourceAsset.tags.map((t) => t.key),
        sourceAsset.businessTerms,
        sourceAsset.owner,
        limit,
      ]
    );

    return result.rows.map((row) => ({
      asset: this.mapRowToAsset(row),
      score: parseFloat(row.similarity_score || '0'),
      highlights: [],
      matchedTerms: [],
    }));
  }

  /**
   * Search business glossary terms
   */
  async searchTerms(
    searchText: string,
    domain?: string,
    limit: number = 20
  ): Promise<BusinessTerm[]> {
    let query = `
      SELECT * FROM glossary_terms
      WHERE to_tsvector('english', name || ' ' || definition) @@ plainto_tsquery('english', $1)
    `;
    const params: any[] = [searchText];
    let paramIndex = 2;

    if (domain) {
      query += ` AND domain = $${paramIndex}`;
      params.push(domain);
      paramIndex++;
    }

    query += ` ORDER BY ts_rank(to_tsvector('english', name || ' ' || definition), plainto_tsquery('english', $1)) DESC`;
    query += ` LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      definition: row.definition,
      domain: row.domain,
      relatedTerms: row.related_terms || [],
      synonyms: row.synonyms || [],
      status: row.status,
      steward: row.steward,
      attributes: row.attributes,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      linkedAssets: row.linked_assets || [],
    }));
  }

  /**
   * Get popular/trending assets
   */
  async getTrending(limit: number = 10): Promise<DataAsset[]> {
    const result = await this.pool.query(
      `
      SELECT *
      FROM catalog_assets
      WHERE status = 'ACTIVE'
        AND usage_stats IS NOT NULL
      ORDER BY
        (usage_stats->>'queryCount')::int DESC,
        (usage_stats->>'uniqueUsers')::int DESC
      LIMIT $1
    `,
      [limit]
    );

    return result.rows.map((row) => this.mapRowToAsset(row));
  }

  /**
   * Get recently updated assets
   */
  async getRecentlyUpdated(limit: number = 10): Promise<DataAsset[]> {
    const result = await this.pool.query(
      `
      SELECT *
      FROM catalog_assets
      WHERE status = 'ACTIVE'
      ORDER BY updated_at DESC
      LIMIT $1
    `,
      [limit]
    );

    return result.rows.map((row) => this.mapRowToAsset(row));
  }

  /**
   * Build search SQL with ranking
   */
  private buildSearchSQL(
    query: SearchQuery,
    limit: number,
    offset: number
  ): { sql: string; params: any[] } {
    const params: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    // Full-text search
    if (query.query) {
      conditions.push(`search_vector @@ plainto_tsquery('english', $${paramIndex})`);
      params.push(query.query);
      paramIndex++;
    }

    // Type filter
    if (query.types && query.types.length > 0) {
      conditions.push(`type = ANY($${paramIndex}::text[])`);
      params.push(query.types);
      paramIndex++;
    }

    // Classification filter
    if (query.classifications && query.classifications.length > 0) {
      conditions.push(`classification = ANY($${paramIndex}::text[])`);
      params.push(query.classifications);
      paramIndex++;
    }

    // Owner filter
    if (query.owner) {
      conditions.push(`owner = $${paramIndex}`);
      params.push(query.owner);
      paramIndex++;
    }

    // Status filter
    if (query.status && query.status.length > 0) {
      conditions.push(`status = ANY($${paramIndex}::text[])`);
      params.push(query.status);
      paramIndex++;
    }

    // Quality score filter
    if (query.minQualityScore !== undefined) {
      conditions.push(`(usage_stats->>'overallScore')::float >= $${paramIndex}`);
      params.push(query.minQualityScore);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ranking expression
    const rankExpr = query.query
      ? `
        ts_rank(search_vector, plainto_tsquery('english', $1)) *
        CASE WHEN certified THEN ${this.rankingConfig.certifiedBoost} ELSE 1.0 END *
        CASE WHEN usage_stats IS NOT NULL
          THEN (1.0 + LEAST((usage_stats->>'queryCount')::float / 1000.0, ${this.rankingConfig.usageBoost}))
          ELSE 1.0
        END
      `
      : '1.0';

    // Build ORDER BY clause
    let orderBy = `${rankExpr} DESC`;
    if (query.sort) {
      orderBy = `${query.sort.field} ${query.sort.order.toUpperCase()}, ${orderBy}`;
    }

    const sql = `
      SELECT *, ${rankExpr} as rank_score
      FROM catalog_search_index
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    return { sql, params };
  }

  /**
   * Build count SQL
   */
  private buildCountSQL(query: SearchQuery): { sql: string; params: any[] } {
    const params: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (query.query) {
      conditions.push(`search_vector @@ plainto_tsquery('english', $${paramIndex})`);
      params.push(query.query);
      paramIndex++;
    }

    if (query.types && query.types.length > 0) {
      conditions.push(`type = ANY($${paramIndex}::text[])`);
      params.push(query.types);
      paramIndex++;
    }

    if (query.classifications && query.classifications.length > 0) {
      conditions.push(`classification = ANY($${paramIndex}::text[])`);
      params.push(query.classifications);
      paramIndex++;
    }

    if (query.owner) {
      conditions.push(`owner = $${paramIndex}`);
      params.push(query.owner);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `SELECT COUNT(*) FROM catalog_search_index ${whereClause}`;

    return { sql, params };
  }

  /**
   * Build facets for filtering
   */
  private async buildFacets(query: SearchQuery): Promise<any> {
    const facets: any = {
      types: {},
      classifications: {},
      domains: {},
      tags: {},
    };

    // Get type facets
    const typeResult = await this.pool.query(`
      SELECT type, COUNT(*) as count
      FROM catalog_search_index
      GROUP BY type
      ORDER BY count DESC
    `);
    typeResult.rows.forEach((row) => {
      facets.types[row.type] = parseInt(row.count, 10);
    });

    // Get classification facets
    const classResult = await this.pool.query(`
      SELECT classification, COUNT(*) as count
      FROM catalog_search_index
      GROUP BY classification
      ORDER BY count DESC
    `);
    classResult.rows.forEach((row) => {
      facets.classifications[row.classification] = parseInt(row.count, 10);
    });

    // Get tag facets (top 20)
    const tagResult = await this.pool.query(`
      SELECT
        tag->>'key' as tag_key,
        COUNT(*) as count
      FROM catalog_search_index,
      jsonb_array_elements(tags) as tag
      GROUP BY tag->>'key'
      ORDER BY count DESC
      LIMIT 20
    `);
    tagResult.rows.forEach((row) => {
      facets.tags[row.tag_key] = parseInt(row.count, 10);
    });

    return facets;
  }

  /**
   * Extract highlights from search results
   */
  private extractHighlights(row: any, searchQuery?: string): any[] {
    if (!searchQuery) return [];

    const highlights: any[] = [];
    const terms = searchQuery.toLowerCase().split(/\s+/);

    // Check name
    if (row.name && terms.some((term) => row.name.toLowerCase().includes(term))) {
      highlights.push({
        field: 'name',
        matches: [row.name],
      });
    }

    // Check description
    if (row.description && terms.some((term) => row.description.toLowerCase().includes(term))) {
      highlights.push({
        field: 'description',
        matches: [row.description.substring(0, 200) + '...'],
      });
    }

    return highlights;
  }

  /**
   * Map database row to DataAsset
   */
  private mapRowToAsset(row: any): DataAsset {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name || row.name,
      type: row.type as AssetType,
      description: row.description || '',
      classification: row.classification as DataClassification,
      status: row.status,
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

  /**
   * Get cache key for a query
   */
  private getCacheKey(query: SearchQuery): string {
    return JSON.stringify(query);
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
  }
}
