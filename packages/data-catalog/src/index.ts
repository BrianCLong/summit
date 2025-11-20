/**
 * Data Catalog Engine
 * Main entry point for the data catalog system
 * Integrates metadata extraction, asset discovery, glossary management, and search
 */

import { Pool } from 'pg';
import { MetadataExtractor, MetadataExtractorConfig } from './metadata/metadata-extractor.js';
import { AssetDiscovery, AssetDiscoveryConfig } from './discovery/asset-discovery.js';
import { GlossaryManager, GlossaryConfig } from './glossary/glossary-manager.js';
import { SearchEngine, SearchEngineConfig } from './search/search-engine.js';
import {
  CatalogConfig,
  DataAsset,
  BusinessTerm,
  ExtractionConfig,
  ExtractionResult,
  SearchQuery,
  SearchResults,
  AssetRelationship,
  MetadataTag,
} from './types.js';

/**
 * Data Catalog Engine Configuration
 */
export interface DataCatalogEngineConfig {
  /** Database configuration */
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    max?: number;
    idleTimeoutMillis?: number;
  };
  /** Metadata extractor configuration */
  extractor?: MetadataExtractorConfig;
  /** Search engine configuration */
  search?: Omit<SearchEngineConfig, 'pool'>;
  /** Glossary configuration */
  glossary?: Omit<GlossaryConfig, 'pool'>;
  /** Asset discovery configuration */
  discovery?: Omit<AssetDiscoveryConfig, 'pool'>;
}

/**
 * Data Catalog Engine
 * Main orchestration class for the data catalog system
 */
export class DataCatalogEngine {
  private pool: Pool;
  private metadataExtractor: MetadataExtractor;
  private assetDiscovery: AssetDiscovery;
  private glossaryManager: GlossaryManager;
  private searchEngine: SearchEngine;
  private config: DataCatalogEngineConfig;
  private initialized: boolean = false;

  constructor(config: DataCatalogEngineConfig) {
    this.config = config;

    // Initialize database connection pool
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.username,
      password: config.database.password,
      max: config.database.max || 20,
      idleTimeoutMillis: config.database.idleTimeoutMillis || 30000,
    });

    // Initialize components
    this.metadataExtractor = new MetadataExtractor(config.extractor || {});

    this.assetDiscovery = new AssetDiscovery({
      pool: this.pool,
      ...config.discovery,
    });

    this.glossaryManager = new GlossaryManager({
      pool: this.pool,
      ...config.glossary,
    });

    this.searchEngine = new SearchEngine({
      pool: this.pool,
      ...config.search,
    });
  }

  /**
   * Initialize the catalog engine
   * Sets up database schema and search indexes
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Data catalog already initialized');
      return;
    }

    try {
      console.log('Initializing data catalog engine...');

      // Initialize database schemas
      await this.assetDiscovery.initialize();
      await this.glossaryManager.initialize();
      await this.searchEngine.initialize();

      this.initialized = true;
      console.log('Data catalog engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize data catalog:', error);
      throw error;
    }
  }

  /**
   * Extract metadata from a data source
   */
  async extractMetadata(config: ExtractionConfig): Promise<ExtractionResult> {
    this.ensureInitialized();
    return this.metadataExtractor.extract(config);
  }

  /**
   * Extract metadata with semantic enrichment
   */
  async extractMetadataWithEnrichment(config: ExtractionConfig): Promise<ExtractionResult> {
    this.ensureInitialized();
    return this.metadataExtractor.extractWithEnrichment(config);
  }

  /**
   * Register a data asset in the catalog
   */
  async registerAsset(asset: DataAsset): Promise<DataAsset> {
    this.ensureInitialized();
    const registered = await this.assetDiscovery.registerAsset(asset);
    // Refresh search index after registration
    await this.searchEngine.refreshIndex();
    return registered;
  }

  /**
   * Register multiple assets in bulk
   */
  async registerAssets(assets: DataAsset[]): Promise<DataAsset[]> {
    this.ensureInitialized();
    const registered: DataAsset[] = [];

    for (const asset of assets) {
      try {
        const result = await this.assetDiscovery.registerAsset(asset);
        registered.push(result);
      } catch (error) {
        console.error(`Failed to register asset ${asset.name}:`, error);
      }
    }

    // Refresh search index once after all registrations
    await this.searchEngine.refreshIndex();
    return registered;
  }

  /**
   * Update an existing asset
   */
  async updateAsset(id: string, updates: Partial<DataAsset>): Promise<DataAsset> {
    this.ensureInitialized();
    const updated = await this.assetDiscovery.updateAsset(id, updates);
    await this.searchEngine.refreshIndex();
    return updated;
  }

  /**
   * Get an asset by ID
   */
  async getAsset(id: string): Promise<DataAsset | null> {
    this.ensureInitialized();
    return this.assetDiscovery.getAssetById(id);
  }

  /**
   * Get an asset by name
   */
  async getAssetByName(name: string): Promise<DataAsset | null> {
    this.ensureInitialized();
    return this.assetDiscovery.getAssetByName(name);
  }

  /**
   * Delete an asset
   */
  async deleteAsset(id: string, deletedBy: string): Promise<void> {
    this.ensureInitialized();
    await this.assetDiscovery.deleteAsset(id, deletedBy);
    await this.searchEngine.refreshIndex();
  }

  /**
   * List assets with filtering
   */
  async listAssets(
    filter?: any,
    limit?: number,
    offset?: number
  ): Promise<{ assets: DataAsset[]; total: number }> {
    this.ensureInitialized();
    return this.assetDiscovery.listAssets(filter, limit, offset);
  }

  /**
   * Search for assets
   */
  async search(query: SearchQuery): Promise<SearchResults> {
    this.ensureInitialized();
    return this.searchEngine.search(query);
  }

  /**
   * Get search suggestions
   */
  async suggest(partial: string, limit?: number): Promise<string[]> {
    this.ensureInitialized();
    return this.searchEngine.suggest(partial, limit);
  }

  /**
   * Find similar assets
   */
  async findSimilar(assetId: string, limit?: number): Promise<any[]> {
    this.ensureInitialized();
    return this.searchEngine.findSimilar(assetId, limit);
  }

  /**
   * Get trending assets
   */
  async getTrending(limit?: number): Promise<DataAsset[]> {
    this.ensureInitialized();
    return this.searchEngine.getTrending(limit);
  }

  /**
   * Get recently updated assets
   */
  async getRecentlyUpdated(limit?: number): Promise<DataAsset[]> {
    this.ensureInitialized();
    return this.searchEngine.getRecentlyUpdated(limit);
  }

  /**
   * Certify an asset
   */
  async certifyAsset(assetId: string, certifiedBy: string): Promise<DataAsset> {
    this.ensureInitialized();
    return this.assetDiscovery.certifyAsset(assetId, certifiedBy);
  }

  /**
   * Add tags to an asset
   */
  async addTags(assetId: string, tags: MetadataTag[]): Promise<DataAsset> {
    this.ensureInitialized();
    return this.assetDiscovery.addTags(assetId, tags);
  }

  /**
   * Remove tags from an asset
   */
  async removeTags(assetId: string, tagIds: string[]): Promise<DataAsset> {
    this.ensureInitialized();
    return this.assetDiscovery.removeTags(assetId, tagIds);
  }

  /**
   * Add a relationship between assets
   */
  async addRelationship(relationship: AssetRelationship): Promise<AssetRelationship> {
    this.ensureInitialized();
    return this.assetDiscovery.addRelationship(relationship);
  }

  /**
   * Get relationships for an asset
   */
  async getRelationships(assetId: string): Promise<AssetRelationship[]> {
    this.ensureInitialized();
    return this.assetDiscovery.getRelationships(assetId);
  }

  // ==================== Glossary Operations ====================

  /**
   * Create a business term
   */
  async createTerm(term: Partial<BusinessTerm>): Promise<BusinessTerm> {
    this.ensureInitialized();
    return this.glossaryManager.createTerm(term);
  }

  /**
   * Update a business term
   */
  async updateTerm(id: string, updates: Partial<BusinessTerm>): Promise<BusinessTerm> {
    this.ensureInitialized();
    return this.glossaryManager.updateTerm(id, updates);
  }

  /**
   * Get a term by ID
   */
  async getTerm(id: string): Promise<BusinessTerm | null> {
    this.ensureInitialized();
    return this.glossaryManager.getTermById(id);
  }

  /**
   * Get a term by name
   */
  async getTermByName(name: string): Promise<BusinessTerm | null> {
    this.ensureInitialized();
    return this.glossaryManager.getTermByName(name);
  }

  /**
   * Search business terms
   */
  async searchTerms(filter?: any, limit?: number, offset?: number): Promise<any> {
    this.ensureInitialized();
    return this.glossaryManager.searchTerms(filter, limit, offset);
  }

  /**
   * Delete a term
   */
  async deleteTerm(id: string): Promise<void> {
    this.ensureInitialized();
    return this.glossaryManager.deleteTerm(id);
  }

  /**
   * Approve a term
   */
  async approveTerm(id: string, approvedBy: string): Promise<BusinessTerm> {
    this.ensureInitialized();
    return this.glossaryManager.approveTerm(id, approvedBy);
  }

  /**
   * Deprecate a term
   */
  async deprecateTerm(id: string, deprecatedBy: string): Promise<BusinessTerm> {
    this.ensureInitialized();
    return this.glossaryManager.deprecateTerm(id, deprecatedBy);
  }

  /**
   * Link a term to an asset
   */
  async linkTermToAsset(
    termId: string,
    assetId: string,
    fieldName?: string,
    confidence?: number,
    linkType?: string,
    createdBy?: string
  ): Promise<void> {
    this.ensureInitialized();
    return this.glossaryManager.linkToAsset(
      termId,
      assetId,
      fieldName,
      confidence,
      linkType,
      createdBy
    );
  }

  /**
   * Unlink a term from an asset
   */
  async unlinkTermFromAsset(termId: string, assetId: string, fieldName?: string): Promise<void> {
    this.ensureInitialized();
    return this.glossaryManager.unlinkFromAsset(termId, assetId, fieldName);
  }

  /**
   * Get terms for an asset
   */
  async getTermsForAsset(assetId: string): Promise<BusinessTerm[]> {
    this.ensureInitialized();
    return this.glossaryManager.getTermsForAsset(assetId);
  }

  /**
   * Get all domains in the glossary
   */
  async getDomains(): Promise<string[]> {
    this.ensureInitialized();
    return this.glossaryManager.getDomains();
  }

  /**
   * Get terms by domain
   */
  async getTermsByDomain(domain: string): Promise<BusinessTerm[]> {
    this.ensureInitialized();
    return this.glossaryManager.getTermsByDomain(domain);
  }

  // ==================== Maintenance Operations ====================

  /**
   * Refresh the search index
   */
  async refreshSearchIndex(): Promise<void> {
    this.ensureInitialized();
    await this.searchEngine.refreshIndex();
  }

  /**
   * Clear the search cache
   */
  clearSearchCache(): void {
    this.searchEngine.clearCache();
  }

  /**
   * Get catalog statistics
   */
  async getStatistics(): Promise<{
    totalAssets: number;
    assetsByType: { [key: string]: number };
    totalTerms: number;
    termsByDomain: { [key: string]: number };
    certifiedAssets: number;
  }> {
    this.ensureInitialized();

    const stats = {
      totalAssets: 0,
      assetsByType: {} as { [key: string]: number },
      totalTerms: 0,
      termsByDomain: {} as { [key: string]: number },
      certifiedAssets: 0,
    };

    // Get asset statistics
    const assetStats = await this.pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE certified = true) as certified,
        type,
        COUNT(*) as type_count
      FROM catalog_assets
      WHERE status = 'ACTIVE'
      GROUP BY ROLLUP(type)
    `);

    for (const row of assetStats.rows) {
      if (row.type === null) {
        stats.totalAssets = parseInt(row.total, 10);
        stats.certifiedAssets = parseInt(row.certified, 10);
      } else {
        stats.assetsByType[row.type] = parseInt(row.type_count, 10);
      }
    }

    // Get term statistics
    const termStats = await this.pool.query(`
      SELECT
        COUNT(*) as total,
        domain,
        COUNT(*) as domain_count
      FROM glossary_terms
      GROUP BY ROLLUP(domain)
    `);

    for (const row of termStats.rows) {
      if (row.domain === null) {
        stats.totalTerms = parseInt(row.total, 10);
      } else {
        stats.termsByDomain[row.domain] = parseInt(row.domain_count, 10);
      }
    }

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    components: {
      database: boolean;
      search: boolean;
    };
  }> {
    const health = {
      status: 'healthy' as 'healthy' | 'unhealthy',
      components: {
        database: false,
        search: false,
      },
    };

    try {
      // Check database
      await this.pool.query('SELECT 1');
      health.components.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
      health.status = 'unhealthy';
    }

    try {
      // Check search index
      await this.pool.query('SELECT 1 FROM catalog_search_index LIMIT 1');
      health.components.search = true;
    } catch (error) {
      console.error('Search health check failed:', error);
      health.status = 'unhealthy';
    }

    return health;
  }

  /**
   * Close the catalog engine and cleanup resources
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.initialized = false;
    console.log('Data catalog engine closed');
  }

  /**
   * Ensure the engine is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Data catalog engine not initialized. Call initialize() first.');
    }
  }
}

// Export all types and classes
export * from './types.js';
export { MetadataExtractor } from './metadata/metadata-extractor.js';
export { AssetDiscovery } from './discovery/asset-discovery.js';
export { GlossaryManager } from './glossary/glossary-manager.js';
export { SearchEngine } from './search/search-engine.js';
