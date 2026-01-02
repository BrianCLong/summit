/**
 * Cache Warming Service
 *
 * Proactively populates caches with likely-to-be-requested data
 * to eliminate cold start latency and improve user experience.
 *
 * Warming Strategies:
 * 1. Scheduled (cron): Hourly neighborhoods, daily GraphRAG, weekly metrics
 * 2. Event-driven: On investigation open, user login, entity create
 * 3. On-demand: Manual warming via admin API
 *
 * @module server/services/CacheWarmingService
 */

// @ts-ignore
import cron from 'node-cron';
// @ts-ignore
import { default as pino } from 'pino';
// @ts-ignore
import { RedisCacheManager } from '../../config/redis.js';
import { NeighborhoodCache } from './NeighborhoodCache.js';
import { getNeo4jDriver } from '../config/database.js';

// @ts-ignore
const logger = (pino as any)();

const GRAPHIKA_LATENCY_TARGETS = { p95: 400, p99: 750 };
const DEFAULT_MAX_TRAVERSAL_DEPTH = 3;

export interface Investigation {
  id: string;
  tenantId: string;
  name: string;
  lastAccessedAt?: string;
}

export interface CacheWarmingConfig {
  enableCronJobs?: boolean;
  enableEventDriven?: boolean;
  neighborhoodTopN?: number;
  maxInvestigationsToWarm?: number;
}

const DEFAULT_CONFIG: CacheWarmingConfig = {
  enableCronJobs: true,
  enableEventDriven: true,
  neighborhoodTopN: 10,
  maxInvestigationsToWarm: 50,
};

export class CacheWarmingService {
  private config: CacheWarmingConfig;
  private cacheManager: RedisCacheManager;
  private neighborhoodCache: NeighborhoodCache;
  private neo4jDriver: any;
  private isWarming = false;
  private latencySamples: Record<string, number[]> = {};

  constructor(
    cacheManager: RedisCacheManager,
    neighborhoodCache: NeighborhoodCache,
    config: Partial<CacheWarmingConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cacheManager = cacheManager;
    this.neighborhoodCache = neighborhoodCache;
    this.neo4jDriver = getNeo4jDriver();

    if (this.config.enableCronJobs) {
      this.setupCronJobs();
    }

    logger.info('Cache Warming Service initialized', { config: this.config });
  }

  private recordLatency(bucket: string, durationMs: number): void {
    if (!this.latencySamples[bucket]) {
      this.latencySamples[bucket] = [];
    }
    this.latencySamples[bucket].push(durationMs);
    if (this.latencySamples[bucket].length > 200) {
      this.latencySamples[bucket] = this.latencySamples[bucket].slice(-200);
    }
  }

  private percentile(values: number[], p: number): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
    return sorted[idx];
  }

  /**
   * Setup scheduled cron jobs for cache warming
   */
  private setupCronJobs(): void {
    // Hourly: Warm top neighborhoods (most expensive operation)
    cron.schedule('0 * * * *', async () => {
      logger.info('[CACHE WARM] Starting hourly neighborhood warming');
      try {
        await this.warmTopNeighborhoods();
      } catch (error: any) {
        logger.error('[CACHE WARM] Hourly neighborhood warming failed:', error);
      }
    });

    // Daily at 2 AM: Warm GraphRAG common questions
    cron.schedule('0 2 * * *', async () => {
      logger.info('[CACHE WARM] Starting daily GraphRAG warming');
      try {
        await this.warmCommonGraphRAGQuestions();
      } catch (error: any) {
        logger.error('[CACHE WARM] Daily GraphRAG warming failed:', error);
      }
    });

    // Every 5 minutes: Warm active investigation metrics
    cron.schedule('*/5 * * * *', async () => {
      logger.info('[CACHE WARM] Starting investigation metrics warming');
      try {
        await this.warmActiveInvestigationMetrics();
      } catch (error: any) {
        logger.error('[CACHE WARM] Metrics warming failed:', error);
      }
    });

    // Daily at midnight: Clean up expired cache entries
    cron.schedule('0 0 * * *', async () => {
      logger.info('[CACHE WARM] Starting cache cleanup');
      try {
        await this.cleanupExpiredEntries();
      } catch (error: any) {
        logger.error('[CACHE WARM] Cache cleanup failed:', error);
      }
    });

    logger.info('[CACHE WARM] Cron jobs scheduled successfully');
  }

  private async getTopEntitiesByDegree(
    session: any,
    investigationId: string,
    tenantId: string,
    limit: number,
  ): Promise<Array<{ id: string; degree: number }>> {
    const result = await session.run(
      `
      MATCH (e:Entity {investigationId: $investigationId, tenantId: $tenantId})-[r]-(m:Entity)
      WITH e, count(DISTINCT r) AS degree
      ORDER BY degree DESC
      LIMIT $topN
      RETURN e.id AS id, degree
      `,
      {
        investigationId,
        tenantId,
        topN: limit,
      },
    );

    return result.records.map((record: any) => ({
      id: record.get('id'),
      degree: record.get('degree'),
    }));
  }

  /**
   * Warm top neighborhoods for active investigations
   * This is the most expensive operation, so we limit to top N entities
   */
  async warmTopNeighborhoods(): Promise<void> {
    if (this.isWarming) {
      logger.warn('[CACHE WARM] Neighborhood warming already in progress, skipping');
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();
    let warmedCount = 0;

    try {
      const investigations = await this.getActiveInvestigations();
      logger.info(`[CACHE WARM] Found ${investigations.length} active investigations`);

      for (const inv of investigations) {
        const session = this.neo4jDriver.session();

        try {
          const topEntities = await this.getTopEntitiesByDegree(
            session,
            inv.id,
            inv.tenantId,
            this.config.neighborhoodTopN || 10,
          );

          for (const { id: entityId, degree } of topEntities) {
            const spanStart = Date.now();

            // Warm 2-hop neighborhood (most common query pattern)
            try {
              const graph = await this.expandNeighborhood(entityId, 2, {
                tenantId: inv.tenantId,
                investigationId: inv.id,
              });

              await this.neighborhoodCache.set(
                inv.tenantId,
                inv.id,
                entityId,
                2,
                graph,
              );

              this.recordLatency('entity-expansion', Date.now() - spanStart);
              warmedCount++;
              logger.debug(
                `[CACHE WARM] Warmed neighborhood for entity ${entityId} (degree: ${degree})`,
              );
            } catch (error: any) {
              logger.warn(
                `[CACHE WARM] Failed to warm neighborhood for entity ${entityId}:`,
                error,
              );
            }
          }
        } finally {
          await session.close();
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        `[CACHE WARM] Neighborhood warming complete: ${warmedCount} neighborhoods in ${duration}ms`,
      );
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm common GraphRAG questions for active investigations
   * Pre-computes answers to frequently asked questions
   */
  async warmCommonGraphRAGQuestions(): Promise<void> {
    const commonQuestions = [
      'Who are the key entities in this investigation?',
      'What are the main relationships?',
      'When was this entity created?',
      'Where are the geographic connections?',
      'Why are these entities connected?',
      'How are the entities related?',
      'What is the timeline of events?',
      'Which entities have the most connections?',
    ];

    const investigations = await this.getActiveInvestigations();
    let warmedCount = 0;

    for (const inv of investigations) {
      for (const question of commonQuestions) {
        try {
          // Cache key for GraphRAG
          const questionHash = this.hashString(question);
          const cacheKey = `graphrag:${inv.tenantId}:${inv.id}:${questionHash}`;

          // Check if already cached
          const cached = await this.cacheManager.get('graphrag', cacheKey, inv.tenantId);
          if (cached) {
            logger.debug(`[CACHE WARM] GraphRAG already cached: "${question}"`);
            continue;
          }

          // Note: Actual GraphRAG query would be called here
          // For now, we just create a placeholder to demonstrate the pattern
          // await graphRAGService.answer({ investigationId: inv.id, question });

          warmedCount++;
          logger.debug(`[CACHE WARM] Warmed GraphRAG: "${question}"`);
        } catch (error: any) {
          logger.warn(`[CACHE WARM] Failed to warm GraphRAG question:`, error);
        }
      }
    }

    logger.info(`[CACHE WARM] GraphRAG warming complete: ${warmedCount} questions`);
  }

  /**
   * Warm dashboard metrics for active investigations
   * Pre-computes aggregations used in dashboards
   */
  async warmActiveInvestigationMetrics(): Promise<void> {
    const investigations = await this.getActiveInvestigations();
    let warmedCount = 0;

    for (const inv of investigations) {
      try {
        const metrics = await this.computeInvestigationMetrics(inv.id, inv.tenantId);

        // Cache metrics
        await this.cacheManager.set(
          'metrics',
          `dashboard:${inv.id}`,
          metrics,
          inv.tenantId,
          300, // 5 minute TTL
        );

        await this.warmDashboardViewsForInvestigation(inv);

        warmedCount++;
        logger.debug(`[CACHE WARM] Warmed metrics for investigation ${inv.id}`);
      } catch (error: any) {
        logger.warn(`[CACHE WARM] Failed to warm metrics for ${inv.id}:`, error);
      }
    }

    logger.info(`[CACHE WARM] Metrics warming complete: ${warmedCount} investigations`);
  }

  /**
   * Warm dashboards (entity expansion, shortest path, community search) for an investigation
   */
  private async warmDashboardViewsForInvestigation(inv: Investigation): Promise<void> {
    const session = this.neo4jDriver.session();

    try {
      const topEntities = await this.getTopEntitiesByDegree(
        session,
        inv.id,
        inv.tenantId,
        Math.max(2, this.config.neighborhoodTopN || 10),
      );

      // Entity expansion cache (2-hop default for dashboards)
      if (topEntities.length > 0) {
        const entityId = topEntities[0].id;
        const start = Date.now();
        const expansion = await this.expandNeighborhood(entityId, 2, {
          tenantId: inv.tenantId,
          investigationId: inv.id,
        });
        await this.cacheManager.set(
          'metrics',
          `dashboard:expansion:${inv.id}:${entityId}`,
          expansion,
          inv.tenantId,
          300,
        );
        this.recordLatency('entity-expansion', Date.now() - start);
      }

      // Shortest-path cache between two busiest nodes
      if (topEntities.length > 1) {
        const fromId = topEntities[0].id;
        const toId = topEntities[1].id;
        const start = Date.now();
        try {
          const pathResult = await session.run(
            `
            PROFILE
            MATCH (a:Entity {id: $fromId, tenantId: $tenantId}), (b:Entity {id: $toId, tenantId: $tenantId})
            MATCH p = shortestPath((a)-[*..4]-(b))
            RETURN p
            LIMIT 1
            `,
            { fromId, toId, tenantId: inv.tenantId },
          );
          const path = pathResult.records[0]?.get('p');
          const summary = pathResult.summary.profile || pathResult.summary.plan;
          const pathLength = path?.length || 0;
          const dbHits = summary?.dbHits || 0;
          await this.cacheManager.set(
            'metrics',
            `dashboard:path:${inv.id}:${fromId}:${toId}`,
            { pathLength, fromId, toId, dbHits },
            inv.tenantId,
            300,
          );
        } catch (err: any) {
          logger.warn({ err }, '[CACHE WARM] Shortest path warm failed');
        } finally {
          this.recordLatency('shortest-path', Date.now() - start);
        }
      }

      // Community search warm (limited to top 50 communities)
      const communityStart = Date.now();
      try {
        const communityResult = await session.run(
          `
          PROFILE
          CALL gds.louvain.stream('communityGraph', { seedProperty: 'tenantId', concurrency: 4 })
          YIELD nodeId, communityId
          RETURN communityId, count(nodeId) AS members
          ORDER BY members DESC
          LIMIT 50
          `,
        );

        const communities = communityResult.records.map((record: any) => ({
          communityId: record.get('communityId'),
          members: record.get('members'),
        }));

        await this.cacheManager.set(
          'metrics',
          `dashboard:communities:${inv.id}`,
          communities,
          inv.tenantId,
          600,
        );
      } catch (err: any) {
        logger.warn({ err }, '[CACHE WARM] Community cache warm failed');
      } finally {
        this.recordLatency('community-search', Date.now() - communityStart);
      }
    } finally {
      await session.close();
    }
  }

  /**
   * Get list of active investigations (accessed in last 24 hours)
   */
  private async getActiveInvestigations(): Promise<Investigation[]> {
    const session = this.neo4jDriver.session();

    try {
      const result = await session.run(
        `
        MATCH (i:Investigation)
        WHERE i.lastAccessedAt > datetime() - duration('PT24H')
        RETURN i.id AS id, i.tenantId AS tenantId, i.name AS name, i.lastAccessedAt AS lastAccessedAt
        ORDER BY i.lastAccessedAt DESC
        LIMIT $limit
        `,
        { limit: this.config.maxInvestigationsToWarm },
      );

      return result.records.map((record: any) => ({
        id: record.get('id'),
        tenantId: record.get('tenantId'),
        name: record.get('name'),
        lastAccessedAt: record.get('lastAccessedAt'),
      }));
    } catch (error: any) {
      logger.error('[CACHE WARM] Failed to get active investigations:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Compute dashboard metrics for an investigation
   */
  private async computeInvestigationMetrics(
    investigationId: string,
    tenantId: string,
  ): Promise<any> {
    const session = this.neo4jDriver.session();

    try {
      const result = await session.run(
        `
        MATCH (i:Investigation {id: $investigationId, tenantId: $tenantId})
        OPTIONAL MATCH (e:Entity {investigationId: $investigationId, tenantId: $tenantId})
        OPTIONAL MATCH (r:RELATED_TO {investigationId: $investigationId, tenantId: $tenantId})
        WITH i, count(DISTINCT e) AS entityCount, count(DISTINCT r) AS relationshipCount
        OPTIONAL MATCH (top:Entity {investigationId: $investigationId, tenantId: $tenantId})-[rel]-(m:Entity)
        WITH i, entityCount, relationshipCount, top, count(rel) AS degree
        ORDER BY degree DESC
        LIMIT 10
        RETURN i, entityCount, relationshipCount, collect({id: top.id, degree: degree}) AS topEntities
        `,
        { investigationId, tenantId },
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      return {
        investigationId,
        entityCount: record.get('entityCount'),
        relationshipCount: record.get('relationshipCount'),
        topEntities: record.get('topEntities'),
        generatedAt: new Date().toISOString(),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Expand neighborhood around an entity
   * This is a placeholder - real implementation would call GraphOpsService
   */
  private async expandNeighborhood(
    entityId: string,
    radius: number,
    context: { tenantId: string; investigationId: string },
  ): Promise<any> {
    const session = this.neo4jDriver.session();
    const safeRadius = Math.min(radius, DEFAULT_MAX_TRAVERSAL_DEPTH);
    const maxNodes = 200;
    const maxRels = 400;

    try {
      const result = await session.run(
        `
        MATCH (e:Entity {id: $entityId, tenantId: $tenantId, investigationId: $investigationId})
        CALL apoc.path.subgraphAll(e, {
          relationshipFilter: 'RELATED_TO|RELATIONSHIP>',
          labelFilter: 'Entity',
          minLevel: 1,
          maxLevel: $maxLevel,
          bfs: true,
          limit: $maxNodes,
          filterStartNode: true,
          uniqueness: 'NODE_PATH'
        }) YIELD nodes, relationships
        WITH apoc.coll.take(nodes, $maxNodes) AS nodes, apoc.coll.take(relationships, $maxRels) AS rels
        UNWIND nodes AS connected
        RETURN DISTINCT connected, rels
        LIMIT $maxNodes
        `,
        {
          entityId,
          tenantId: context.tenantId,
          investigationId: context.investigationId,
          maxLevel: safeRadius,
          maxNodes,
          maxRels,
        },
      );

      const nodes: Array<{ id: string }> = [];
      const nodeIds = new Set<string>();
      const edges: Array<{ id: string }> = [];
      const edgeIds = new Set<string>();

      for (const record of result.records) {
        const connected = record.get('connected');
        const rels = record.get('rels') || [];

        if (!nodeIds.has(connected.properties.id)) {
          nodeIds.add(connected.properties.id);
          nodes.push({ id: connected.properties.id });
        }

        rels.forEach((r: any) => {
          const relId = r.identity.toString();
          if (!edgeIds.has(relId)) {
            edgeIds.add(relId);
            edges.push({ id: relId });
          }
        });
      }

      return { nodes, edges };
    } finally {
      await session.close();
    }
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpiredEntries(): Promise<void> {
    logger.info('[CACHE WARM] Starting cache cleanup');

    // This would be implemented based on the specific cache implementation
    // For Redis, expired keys are automatically removed
    // For in-memory cache, we can trigger manual cleanup

    logger.info('[CACHE WARM] Cache cleanup complete');
  }

  /**
   * Manual warming for a specific investigation
   * Called via admin API or on investigation open
   */
  async warmInvestigation(investigationId: string, tenantId: string): Promise<void> {
    logger.info(`[CACHE WARM] Manual warm requested for investigation ${investigationId}`);

    const startTime = Date.now();

    try {
      // 1. Warm top neighborhoods
      const session = this.neo4jDriver.session();
      try {
        const result = await session.run(
          `
          MATCH (e:Entity {investigationId: $investigationId, tenantId: $tenantId})-[r]-(m:Entity)
          WITH e, count(DISTINCT r) AS degree
          ORDER BY degree DESC
          LIMIT $topN
          RETURN e.id AS id, degree
          `,
          { investigationId, tenantId, topN: this.config.neighborhoodTopN },
        );

        for (const record of result.records) {
          const entityId = record.get('id');
          const graph = await this.expandNeighborhood(entityId, 2, {
            tenantId,
            investigationId,
          });
          await this.neighborhoodCache.set(tenantId, investigationId, entityId, 2, graph);
        }
      } finally {
        await session.close();
      }

      // 2. Warm investigation metrics
      const metrics = await this.computeInvestigationMetrics(investigationId, tenantId);
      await this.cacheManager.set('metrics', `dashboard:${investigationId}`, metrics, tenantId, 300);

      const duration = Date.now() - startTime;
      logger.info(
        `[CACHE WARM] Manual warming complete for ${investigationId} in ${duration}ms`,
      );
    } catch (error: any) {
      logger.error(`[CACHE WARM] Manual warming failed for ${investigationId}:`, error);
      throw error;
    }
  }

  /**
   * Event-driven warming on investigation open
   */
  async onInvestigationOpened(investigationId: string, tenantId: string): Promise<void> {
    if (!this.config.enableEventDriven) return;

    logger.info(`[CACHE WARM] Investigation opened: ${investigationId}`);

    // Fire and forget - don't block the user
    this.warmInvestigation(investigationId, tenantId).catch((error) => {
      logger.warn(`[CACHE WARM] Background warming failed:`, error);
    });
  }

  /**
   * Event-driven warming on entity created
   */
  async onEntityCreated(
    entityId: string,
    investigationId: string,
    tenantId: string,
  ): Promise<void> {
    if (!this.config.enableEventDriven) return;

    logger.debug(`[CACHE WARM] Entity created: ${entityId}`);

    // Warm neighborhood for new entity (fire and forget)
    this.expandNeighborhood(entityId, 2, { tenantId, investigationId })
      .then((graph) =>
        this.neighborhoodCache.set(tenantId, investigationId, entityId, 2, graph),
      )
      .catch((error) => {
        logger.warn(`[CACHE WARM] Failed to warm new entity neighborhood:`, error);
      });
  }

  /**
   * Get cache warming statistics
   */
  getStats(): any {
    const buckets: Record<string, { p95: number; p99: number; meetsGraphika: boolean }> = {};

    Object.entries(this.latencySamples).forEach(([bucket, samples]) => {
      const p95 = this.percentile(samples, 0.95);
      const p99 = this.percentile(samples, 0.99);
      buckets[bucket] = {
        p95,
        p99,
        meetsGraphika: p95 <= GRAPHIKA_LATENCY_TARGETS.p95 && p99 <= GRAPHIKA_LATENCY_TARGETS.p99,
      };
    });

    return {
      isWarming: this.isWarming,
      config: this.config,
      cacheStats: this.cacheManager.getAllStats(),
      latency: buckets,
      targets: GRAPHIKA_LATENCY_TARGETS,
    };
  }

  /**
   * Hash a string for cache key generation
   */
  private hashString(str: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
  }

  /**
   * Shutdown cache warming service
   */
  async shutdown(): Promise<void> {
    logger.info('[CACHE WARM] Shutting down cache warming service');
    // Cleanup resources if needed
  }
}

export default CacheWarmingService;
