/**
 * Cache Invalidation Service
 *
 * Implements smart cache invalidation strategies:
 * 1. Mutation-triggered: Invalidate on data changes
 * 2. Pattern-based: Bulk invalidation by key patterns
 * 3. Event-driven: React to domain events
 * 4. Cascading: Invalidate dependent caches
 *
 * @module server/services/CacheInvalidationService
 */

import { EventEmitter } from 'events';
import pino from 'pino';
import { RedisCacheManager, CACHE_PREFIX } from '../../config/redis.js';
import { NeighborhoodCache } from './NeighborhoodCache.js';

const logger = pino();

export interface InvalidationEvent {
  type: 'entity' | 'relationship' | 'investigation' | 'user';
  operation: 'created' | 'updated' | 'deleted';
  id: string;
  tenantId: string;
  metadata?: any;
}

export class CacheInvalidationService extends EventEmitter {
  private cacheManager: RedisCacheManager;
  private neighborhoodCache: NeighborhoodCache;
  private invalidationLog: Map<string, Date> = new Map();

  constructor(cacheManager: RedisCacheManager, neighborhoodCache: NeighborhoodCache) {
    super();
    this.cacheManager = cacheManager;
    this.neighborhoodCache = neighborhoodCache;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for cache invalidation
   */
  private setupEventListeners(): void {
    // Entity events
    this.on('entity:created', async (event: InvalidationEvent) => {
      await this.invalidateEntity(event.id, event.tenantId, 'created');
    });

    this.on('entity:updated', async (event: InvalidationEvent) => {
      await this.invalidateEntity(event.id, event.tenantId, 'updated');
    });

    this.on('entity:deleted', async (event: InvalidationEvent) => {
      await this.invalidateEntity(event.id, event.tenantId, 'deleted');
    });

    // Relationship events
    this.on('relationship:created', async (event: InvalidationEvent) => {
      await this.invalidateRelationship(event.id, event.tenantId, event.metadata);
    });

    this.on('relationship:updated', async (event: InvalidationEvent) => {
      await this.invalidateRelationship(event.id, event.tenantId, event.metadata);
    });

    this.on('relationship:deleted', async (event: InvalidationEvent) => {
      await this.invalidateRelationship(event.id, event.tenantId, event.metadata);
    });

    // Investigation events
    this.on('investigation:updated', async (event: InvalidationEvent) => {
      await this.invalidateInvestigation(event.id, event.tenantId);
    });

    this.on('investigation:deleted', async (event: InvalidationEvent) => {
      await this.invalidateInvestigation(event.id, event.tenantId);
    });

    logger.info('Cache invalidation event listeners setup complete');
  }

  /**
   * Invalidate all caches related to an entity
   * Cascading invalidation to dependent caches
   */
  async invalidateEntity(
    entityId: string,
    tenantId: string,
    operation: 'created' | 'updated' | 'deleted' = 'updated',
  ): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info(`Invalidating caches for entity ${entityId} (${operation})`);

      // 1. Direct entity cache
      await this.cacheManager.delete(CACHE_PREFIX.ENTITY, entityId, tenantId);

      // 2. Entity with relationships (full view)
      await this.cacheManager.delete(CACHE_PREFIX.ENTITY, `${entityId}:full`, tenantId);

      // 3. Neighborhood caches containing this entity
      await this.invalidateNeighborhoods(entityId, tenantId);

      // 4. Similarity caches for this entity
      await this.invalidateSimilarity(entityId, tenantId);

      // 5. GraphQL queries that might include this entity
      await this.cacheManager.invalidateGraphQLQueries(tenantId);

      // 6. Dashboard metrics (entity count, etc.)
      await this.cacheManager.invalidateGraphMetrics(tenantId);

      // 7. GraphRAG caches (if entity is referenced)
      await this.invalidateGraphRAGByEntity(entityId, tenantId);

      // 8. DataLoader caches
      await this.invalidateDataLoader('entity', entityId);

      // Record invalidation for analytics
      this.recordInvalidation(`entity:${entityId}`, operation);

      const duration = Date.now() - startTime;
      logger.info(`Entity cache invalidation complete for ${entityId} in ${duration}ms`);
    } catch (error) {
      logger.error(`Failed to invalidate entity caches for ${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate all caches related to a relationship
   */
  async invalidateRelationship(
    relationshipId: string,
    tenantId: string,
    metadata?: { from?: string; to?: string },
  ): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info(`Invalidating caches for relationship ${relationshipId}`);

      // 1. Direct relationship cache
      await this.cacheManager.delete(CACHE_PREFIX.RELATIONSHIP, relationshipId, tenantId);

      // 2. If we know the source and target, invalidate their caches too
      if (metadata?.from) {
        await this.invalidateEntity(metadata.from, tenantId, 'updated');
      }
      if (metadata?.to) {
        await this.invalidateEntity(metadata.to, tenantId, 'updated');
      }

      // 3. Relationship list caches
      if (metadata?.from && metadata?.to) {
        await this.cacheManager.delete(
          CACHE_PREFIX.RELATIONSHIP,
          `${metadata.from}:${metadata.to}`,
          tenantId,
        );
      }

      // 4. Neighborhood caches (relationships change graph structure)
      if (metadata?.from) {
        await this.invalidateNeighborhoods(metadata.from, tenantId);
      }
      if (metadata?.to) {
        await this.invalidateNeighborhoods(metadata.to, tenantId);
      }

      // 5. GraphQL queries
      await this.cacheManager.invalidateGraphQLQueries(tenantId);

      // 6. Metrics
      await this.cacheManager.invalidateGraphMetrics(tenantId);

      // 7. DataLoader caches
      await this.invalidateDataLoader('relationship', relationshipId);
      if (metadata?.from) {
        await this.invalidateDataLoader('relationships:source', metadata.from);
      }

      this.recordInvalidation(`relationship:${relationshipId}`, 'updated');

      const duration = Date.now() - startTime;
      logger.info(`Relationship cache invalidation complete for ${relationshipId} in ${duration}ms`);
    } catch (error) {
      logger.error(`Failed to invalidate relationship caches for ${relationshipId}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate all caches related to an investigation
   */
  async invalidateInvestigation(investigationId: string, tenantId: string): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info(`Invalidating caches for investigation ${investigationId}`);

      // 1. Investigation metadata
      await this.cacheManager.delete(CACHE_PREFIX.INVESTIGATION, investigationId, tenantId);

      // 2. Investigation metrics
      await this.cacheManager.delete(
        CACHE_PREFIX.INVESTIGATION,
        `${investigationId}:metrics`,
        tenantId,
      );

      // 3. Investigation entity lists (all pages)
      await this.cacheManager.deleteByPattern(
        `${CACHE_PREFIX.INVESTIGATION}:${tenantId}:${investigationId}:entities:*`,
      );

      // 4. All neighborhoods in this investigation
      await this.cacheManager.deleteByPattern(`nbhd:${tenantId}:${investigationId}:*`);

      // 5. All GraphRAG caches for this investigation
      await this.cacheManager.deleteByPattern(`graphrag:${tenantId}:${investigationId}:*`);

      // 6. Dashboard metrics for this investigation
      await this.cacheManager.delete('metrics', `dashboard:${investigationId}`, tenantId);

      // 7. Analytics results for this investigation
      await this.cacheManager.deleteByPattern(`analytics:${tenantId}:*:${investigationId}:*`);

      // 8. GraphQL queries (conservative invalidation)
      await this.cacheManager.invalidateGraphQLQueries(tenantId);

      this.recordInvalidation(`investigation:${investigationId}`, 'updated');

      const duration = Date.now() - startTime;
      logger.info(`Investigation cache invalidation complete for ${investigationId} in ${duration}ms`);
    } catch (error) {
      logger.error(`Failed to invalidate investigation caches for ${investigationId}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate neighborhood caches containing a specific entity
   */
  private async invalidateNeighborhoods(entityId: string, tenantId: string): Promise<void> {
    try {
      // Pattern: nbhd:{tenantId}:*:{entityId}:*
      // This catches all investigations and radii where this entity appears
      const pattern = `nbhd:${tenantId}:*`;

      // Use NeighborhoodCache's invalidation method if available
      // Otherwise fall back to pattern matching
      const investigationIds = await this.getInvestigationsForEntity(entityId, tenantId);

      for (const investigationId of investigationIds) {
        await this.neighborhoodCache.invalidate(tenantId, investigationId, [entityId]);
      }

      logger.debug(`Invalidated neighborhood caches for entity ${entityId}`);
    } catch (error) {
      logger.warn(`Failed to invalidate neighborhood caches:`, error);
    }
  }

  /**
   * Invalidate similarity caches for an entity
   */
  private async invalidateSimilarity(entityId: string, tenantId: string): Promise<void> {
    try {
      const pattern = `similarity:${tenantId}:${entityId}:*`;
      await this.cacheManager.deleteByPattern(pattern);
      logger.debug(`Invalidated similarity caches for entity ${entityId}`);
    } catch (error) {
      logger.warn(`Failed to invalidate similarity caches:`, error);
    }
  }

  /**
   * Invalidate GraphRAG caches that reference an entity
   */
  private async invalidateGraphRAGByEntity(entityId: string, tenantId: string): Promise<void> {
    try {
      // This is conservative - invalidates all GraphRAG for tenant
      // A more sophisticated approach would track entity-question associations
      await this.cacheManager.deleteByPattern(`graphrag:${tenantId}:*`);
      logger.debug(`Invalidated GraphRAG caches for entity ${entityId}`);
    } catch (error) {
      logger.warn(`Failed to invalidate GraphRAG caches:`, error);
    }
  }

  /**
   * Invalidate DataLoader caches
   */
  private async invalidateDataLoader(type: string, id: string): Promise<void> {
    try {
      const key = `dl:${type}:${id}`;
      await this.cacheManager.delete('dataloader', key);
      logger.debug(`Invalidated DataLoader cache: ${key}`);
    } catch (error) {
      logger.warn(`Failed to invalidate DataLoader cache:`, error);
    }
  }

  /**
   * Get investigations containing a specific entity
   */
  private async getInvestigationsForEntity(
    entityId: string,
    tenantId: string,
  ): Promise<string[]> {
    // This would query the database to find investigations
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Record invalidation for analytics and monitoring
   */
  private recordInvalidation(key: string, operation: string): void {
    this.invalidationLog.set(key, new Date());

    // Emit metrics
    // cacheInvalidations.labels(key, operation).inc();
  }

  /**
   * Bulk invalidation by pattern
   * Use with caution - can be expensive
   */
  async invalidateByPattern(pattern: string, tenantId?: string): Promise<number> {
    const startTime = Date.now();

    try {
      logger.info(`Bulk invalidation by pattern: ${pattern}`);

      const deletedCount = await this.cacheManager.deleteByPattern(pattern);

      const duration = Date.now() - startTime;
      logger.info(`Bulk invalidation complete: ${deletedCount} keys in ${duration}ms`);

      return deletedCount;
    } catch (error) {
      logger.error(`Bulk invalidation failed for pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate all caches for a tenant (nuclear option)
   */
  async invalidateAllForTenant(tenantId: string): Promise<void> {
    const startTime = Date.now();

    try {
      logger.warn(`FULL CACHE INVALIDATION for tenant ${tenantId}`);

      // Invalidate all prefixes
      await this.cacheManager.deleteByPattern(`*:${tenantId}:*`);

      const duration = Date.now() - startTime;
      logger.warn(`Full tenant cache invalidation complete in ${duration}ms`);
    } catch (error) {
      logger.error(`Full tenant invalidation failed for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get invalidation statistics
   */
  getStats(): any {
    return {
      recentInvalidations: Array.from(this.invalidationLog.entries())
        .sort((a, b) => b[1].getTime() - a[1].getTime())
        .slice(0, 100)
        .map(([key, timestamp]) => ({ key, timestamp })),
      totalInvalidations: this.invalidationLog.size,
    };
  }

  /**
   * Clear invalidation log (for testing or cleanup)
   */
  clearLog(): void {
    this.invalidationLog.clear();
  }
}

export default CacheInvalidationService;
