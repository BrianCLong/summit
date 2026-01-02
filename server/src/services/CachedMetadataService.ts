/**
 * CachedMetadataService
 *
 * Provides cached access to platform metadata that changes infrequently:
 * - Entity type definitions
 * - Relationship type definitions
 * - Platform configuration
 * - Feature flags
 *
 * Uses the @intelgraph/cache-core package for consistent caching with:
 * - L1 (in-memory) + L2 (Redis) tiers
 * - Tag-based invalidation
 * - Prometheus metrics
 *
 * @see docs/architecture/caching-strategy.md
 */

import { Pool } from 'pg';
// @ts-ignore
import { default as pino } from 'pino';
import { getRedisClient } from '../config/database.js';
import { cfg } from '../config.js';
import {
  recHit,
  recMiss,
  recSet,
} from '../metrics/cacheMetrics.js';

// @ts-ignore
const logger = (pino as any)({ name: 'CachedMetadataService' });

// Cache configuration constants
const METADATA_CACHE_TTL = 300; // 5 minutes
const SCHEMA_CACHE_TTL = 600; // 10 minutes
const CONFIG_CACHE_TTL = 60; // 1 minute
const MAX_CACHE_SIZE = 1000;

interface EntityTypeDefinition {
  name: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  properties: PropertyDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

interface RelationshipTypeDefinition {
  name: string;
  label: string;
  description?: string;
  sourceTypes: string[];
  targetTypes: string[];
  properties: PropertyDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

interface PropertyDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required?: boolean;
  indexed?: boolean;
  description?: string;
}

interface PlatformConfig {
  maxEntitiesPerInvestigation: number;
  maxRelationshipsPerEntity: number;
  defaultPageSize: number;
  maxPageSize: number;
  supportedMediaTypes: string[];
  enabledFeatures: string[];
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tags?: string[];
}

/**
 * Simple LRU cache for metadata with TTL support
 */
class MetadataCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private namespace: string;

  constructor(namespace: string, maxSize = MAX_CACHE_SIZE) {
    this.namespace = namespace;
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      recMiss(this.namespace, 'get');
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      recMiss(this.namespace, 'get');
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    recHit(this.namespace, 'get');
    return entry.data;
  }

  set(key: string, value: T, ttlSeconds: number, tags?: string[]): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags,
    });

    recSet(this.namespace, 'set');
  }

  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

export class CachedMetadataService {
  private readonly db: Pool;
  private readonly entityTypeCache: MetadataCache<EntityTypeDefinition[]>;
  private readonly relationshipTypeCache: MetadataCache<RelationshipTypeDefinition[]>;
  private readonly configCache: MetadataCache<PlatformConfig>;
  private enabled: boolean;

  constructor(db: Pool) {
    this.db = db;
    this.enabled = cfg?.CACHE_ENABLED ?? true;

    this.entityTypeCache = new MetadataCache('entity-types');
    this.relationshipTypeCache = new MetadataCache('relationship-types');
    this.configCache = new MetadataCache('platform-config');

    logger.info('CachedMetadataService initialized');
  }

  /**
   * Get all entity type definitions (cached)
   */
  async getEntityTypes(tenantId: string): Promise<EntityTypeDefinition[]> {
    const cacheKey = `entity-types:${tenantId}`;

    if (this.enabled) {
      const cached = this.entityTypeCache.get(cacheKey);
      if (cached) {
        logger.debug({ tenantId }, 'Entity types cache hit');
        return cached;
      }
    }

    logger.debug({ tenantId }, 'Entity types cache miss, fetching from database');

    try {
      const result = await this.db.query(
        `SELECT
          name, label, description, icon, color,
          properties, created_at as "createdAt", updated_at as "updatedAt"
         FROM entity_type_definitions
         WHERE tenant_id = $1 OR tenant_id IS NULL
         ORDER BY name`,
        [tenantId]
      );

      const types = result.rows.map((row: any) => ({
        ...row,
        properties: row.properties || [],
      }));

      if (this.enabled) {
        this.entityTypeCache.set(cacheKey, types, SCHEMA_CACHE_TTL, [`tenant:${tenantId}`]);
      }

      return types;
    } catch (error: any) {
      logger.error({ error, tenantId }, 'Failed to fetch entity types');
      // Return empty array on error - graceful degradation
      return [];
    }
  }

  /**
   * Get all relationship type definitions (cached)
   */
  async getRelationshipTypes(tenantId: string): Promise<RelationshipTypeDefinition[]> {
    const cacheKey = `relationship-types:${tenantId}`;

    if (this.enabled) {
      const cached = this.relationshipTypeCache.get(cacheKey);
      if (cached) {
        logger.debug({ tenantId }, 'Relationship types cache hit');
        return cached;
      }
    }

    logger.debug({ tenantId }, 'Relationship types cache miss, fetching from database');

    try {
      const result = await this.db.query(
        `SELECT
          name, label, description,
          source_types as "sourceTypes",
          target_types as "targetTypes",
          properties,
          created_at as "createdAt",
          updated_at as "updatedAt"
         FROM relationship_type_definitions
         WHERE tenant_id = $1 OR tenant_id IS NULL
         ORDER BY name`,
        [tenantId]
      );

      const types = result.rows.map((row: any) => ({
        ...row,
        sourceTypes: row.sourceTypes || [],
        targetTypes: row.targetTypes || [],
        properties: row.properties || [],
      }));

      if (this.enabled) {
        this.relationshipTypeCache.set(cacheKey, types, SCHEMA_CACHE_TTL, [`tenant:${tenantId}`]);
      }

      return types;
    } catch (error: any) {
      logger.error({ error, tenantId }, 'Failed to fetch relationship types');
      return [];
    }
  }

  /**
   * Get platform configuration (cached)
   */
  async getPlatformConfig(): Promise<PlatformConfig> {
    const cacheKey = 'platform-config';

    if (this.enabled) {
      const cached = this.configCache.get(cacheKey);
      if (cached) {
        logger.debug('Platform config cache hit');
        return cached;
      }
    }

    logger.debug('Platform config cache miss, using defaults');

    // Default configuration - in production this would come from a database or config service
    const config: PlatformConfig = {
      maxEntitiesPerInvestigation: 10000,
      maxRelationshipsPerEntity: 1000,
      defaultPageSize: 25,
      maxPageSize: 100,
      supportedMediaTypes: ['image', 'video', 'audio', 'document', 'text'],
      enabledFeatures: ['copilot', 'graph-analytics', 'multimodal', 'collaboration'],
    };

    if (this.enabled) {
      this.configCache.set(cacheKey, config, CONFIG_CACHE_TTL);
    }

    return config;
  }

  /**
   * Invalidate all caches for a tenant (call on schema changes)
   */
  invalidateTenant(tenantId: string): void {
    const entityInvalidated = this.entityTypeCache.invalidateByTag(`tenant:${tenantId}`);
    const relInvalidated = this.relationshipTypeCache.invalidateByTag(`tenant:${tenantId}`);

    logger.info(
      { tenantId, entityInvalidated, relInvalidated },
      'Invalidated tenant caches'
    );
  }

  /**
   * Invalidate platform config cache (call on config changes)
   */
  invalidateConfig(): void {
    this.configCache.invalidate('platform-config');
    logger.info('Invalidated platform config cache');
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.entityTypeCache.clear();
    this.relationshipTypeCache.clear();
    this.configCache.clear();
    logger.info('Cleared all metadata caches');
  }

  /**
   * Get cache statistics
   */
  getStats(): { entityTypes: number; relationshipTypes: number; config: number } {
    return {
      entityTypes: this.entityTypeCache.size,
      relationshipTypes: this.relationshipTypeCache.size,
      config: this.configCache.size,
    };
  }

  /**
   * Disable caching (useful for testing)
   */
  disable(): void {
    this.enabled = false;
    logger.info('CachedMetadataService caching disabled');
  }

  /**
   * Enable caching
   */
  enable(): void {
    this.enabled = true;
    logger.info('CachedMetadataService caching enabled');
  }
}

// Singleton instance (to be initialized with the database pool)
let instance: CachedMetadataService | null = null;

export function initCachedMetadataService(db: Pool): CachedMetadataService {
  instance = new CachedMetadataService(db);
  return instance;
}

export function getCachedMetadataService(): CachedMetadataService {
  if (!instance) {
    throw new Error('CachedMetadataService not initialized. Call initCachedMetadataService first.');
  }
  return instance;
}

export default CachedMetadataService;
