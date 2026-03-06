/**
 * Supernode Query Optimizer - Handle high-degree nodes efficiently
 *
 * MVP-4-GA P1 Fix: Supernode Query Optimization
 *
 * This module detects and optimizes queries involving "supernodes" -
 * entities with an unusually high number of connections (>1000).
 *
 * Features:
 * - Automatic supernode detection based on connection count
 * - Query rewriting with pagination for large result sets
 * - Pre-computed aggregations for top supernodes
 * - Connection bucketing for efficient traversal
 * - User-friendly warnings for expensive queries
 *
 * @module SupernodeQueryOptimizer
 */

import { Driver, Session } from 'neo4j-driver';
import Redis from 'ioredis';
import logger from '../utils/logger.js';

const serviceLogger = logger.child({ name: 'SupernodeQueryOptimizer' });

// Types
export interface SupernodeInfo {
  entityId: string;
  label: string;
  type: string;
  connectionCount: number;
  incomingCount: number;
  outgoingCount: number;
  topConnectionTypes: Array<{ type: string; count: number }>;
  lastUpdated: Date;
}

export interface QueryPlan {
  strategy: 'direct' | 'paginated' | 'sampled' | 'cached' | 'blocked';
  originalQuery: string;
  optimizedQuery: string;
  parameters: Record<string, unknown>;
  estimatedCost: number;
  warning?: string;
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
    totalEstimate: number;
  };
}

export interface SupernodeQueryConfig {
  supernodeThreshold: number;          // Connection count to consider supernode
  maxTraversalDepth: number;           // Max hops for supernode queries
  paginationLimit: number;             // Default page size for large results
  samplingRate: number;                // Fraction to sample for very large nodes
  cachePrecomputedStats: boolean;      // Cache supernode statistics
  statsCacheTTL: number;               // TTL for cached stats (seconds)
  blockExpensiveQueries: boolean;      // Block queries over cost threshold
  maxQueryCost: number;                // Maximum allowed query cost
}

const DEFAULT_CONFIG: SupernodeQueryConfig = {
  supernodeThreshold: 1000,
  maxTraversalDepth: 2,
  paginationLimit: 100,
  samplingRate: 0.1,
  cachePrecomputedStats: true,
  statsCacheTTL: 3600,
  blockExpensiveQueries: false,
  maxQueryCost: 100000,
};

// Common high-degree entity types that are often supernodes
const KNOWN_SUPERNODE_TYPES = [
  'Country',
  'City',
  'Currency',
  'Language',
  'Industry',
  'Government',
];

/**
 * Supernode Query Optimizer Service
 *
 * Optimizes Neo4j queries involving high-degree nodes to prevent
 * query timeouts and excessive resource consumption.
 */
export class SupernodeQueryOptimizer {
  private neo4j: Driver;
  private redis: Redis | null;
  private config: SupernodeQueryConfig;
  private supernodeCache: Map<string, SupernodeInfo>;

  constructor(
    neo4jDriver: Driver,
    redisClient?: Redis,
    config: Partial<SupernodeQueryConfig> = {}
  ) {
    this.neo4j = neo4jDriver;
    this.redis = redisClient || null;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.supernodeCache = new Map();
  }

  /**
   * Check if an entity is a supernode
   */
  async isSupernodeById(entityId: string): Promise<boolean> {
    const info = await this.getSupernodeInfo(entityId);
    return info !== null && info.connectionCount >= this.config.supernodeThreshold;
  }

  /**
   * Get supernode information for an entity
   */
  async getSupernodeInfo(entityId: string): Promise<SupernodeInfo | null> {
    // Check cache first
    if (this.supernodeCache.has(entityId)) {
      return this.supernodeCache.get(entityId)!;
    }

    // Check Redis cache
    if (this.redis) {
      const cached = await this.redis.get(`supernode:${entityId}`);
      if (cached) {
        const info = JSON.parse(cached) as SupernodeInfo;
        this.supernodeCache.set(entityId, info);
        return info;
      }
    }

    // Query Neo4j for connection counts
    const session = this.neo4j.session();
    try {
      const result = await session.run(
        `
        MATCH (e:Entity {id: $entityId})
        // BOLT OPTIMIZATION: Use size((e)-->()) and size((e)<--()) for O(1) degree checks via degree store
        WITH e, size((e)-->()) AS outgoing, size((e)<--()) AS incoming
        OPTIONAL MATCH (e)-[r]-()
        WITH e, outgoing, incoming, type(r) AS relType, count(*) AS typeCount
        ORDER BY typeCount DESC
        WITH e, outgoing, incoming, collect({type: relType, count: typeCount})[0..5] AS topTypes
        RETURN e.id AS entityId,
               e.label AS label,
               e.type AS type,
               outgoing + incoming AS connectionCount,
               outgoing,
               incoming,
               topTypes
        `,
        { entityId }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const info: SupernodeInfo = {
        entityId: record.get('entityId'),
        label: record.get('label') || 'Unknown',
        type: record.get('type') || 'Entity',
        connectionCount: record.get('connectionCount').toNumber(),
        incomingCount: record.get('incoming').toNumber(),
        outgoingCount: record.get('outgoing').toNumber(),
        topConnectionTypes: record.get('topTypes') || [],
        lastUpdated: new Date(),
      };

      // Cache if it's a supernode
      if (info.connectionCount >= this.config.supernodeThreshold) {
        this.supernodeCache.set(entityId, info);
        if (this.redis && this.config.cachePrecomputedStats) {
          await this.redis.setex(
            `supernode:${entityId}`,
            this.config.statsCacheTTL,
            JSON.stringify(info)
          );
        }
      }

      return info;
    } finally {
      await session.close();
    }
  }

  /**
   * Detect supernodes in a list of entity IDs
   */
  async detectSupernodes(entityIds: string[]): Promise<SupernodeInfo[]> {
    if (entityIds.length === 0) return [];

    const supernodes: SupernodeInfo[] = [];
    const missingIds: string[] = [];

    // Check memory cache first
    for (const id of entityIds) {
      if (this.supernodeCache.has(id)) {
        const info = this.supernodeCache.get(id)!;
        if (info.connectionCount >= this.config.supernodeThreshold) {
          supernodes.push(info);
        }
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length === 0) return supernodes;

    // BOLT OPTIMIZATION: Batch query for missing IDs using UNWIND to avoid N+1 queries.
    // Also uses size() for O(1) degree checks.
    const session = this.neo4j.session();
    try {
      const result = await session.run(
        `
        UNWIND $entityIds AS entityId
        MATCH (e:Entity {id: entityId})
        WITH e, size((e)-->()) AS outgoing, size((e)<--()) AS incoming
        WITH e, outgoing, incoming, outgoing + incoming AS connectionCount
        WHERE connectionCount >= $threshold
        OPTIONAL MATCH (e)-[r]-()
        WITH e, outgoing, incoming, connectionCount, type(r) AS relType, count(*) AS typeCount
        ORDER BY e.id, typeCount DESC
        WITH e, outgoing, incoming, connectionCount, collect({type: relType, count: typeCount})[0..5] AS topTypes
        RETURN e.id AS entityId,
               e.label AS label,
               e.type AS type,
               connectionCount,
               outgoing,
               incoming,
               topTypes
        `,
        { entityIds: missingIds, threshold: this.config.supernodeThreshold }
      );

      for (const record of result.records) {
        const info: SupernodeInfo = {
          entityId: record.get('entityId'),
          label: record.get('label') || 'Unknown',
          type: record.get('type') || 'Entity',
          connectionCount: record.get('connectionCount').toNumber(),
          incomingCount: record.get('incoming').toNumber(),
          outgoingCount: record.get('outgoing').toNumber(),
          topConnectionTypes: record.get('topTypes') || [],
          lastUpdated: new Date(),
        };

        // Cache it
        this.supernodeCache.set(info.entityId, info);
        supernodes.push(info);

        // Also cache in Redis if enabled
        if (this.redis && this.config.cachePrecomputedStats) {
          await this.redis.setex(
            `supernode:${info.entityId}`,
            this.config.statsCacheTTL,
            JSON.stringify(info)
          );
        }
      }

      return supernodes;
    } finally {
      await session.close();
    }
  }

  /**
   * Optimize a graph traversal query
   */
  async optimizeTraversalQuery(params: {
    startEntityIds: string[];
    maxHops: number;
    relationshipTypes?: string[];
    limit?: number;
    tenantId?: string;
  }): Promise<QueryPlan> {
    const {
      startEntityIds,
      maxHops,
      relationshipTypes,
      limit = this.config.paginationLimit,
      tenantId,
    } = params;

    // Detect supernodes in starting set
    const supernodes = await this.detectSupernodes(startEntityIds);
    const hasSupernode = supernodes.length > 0;
    const maxSupernodeConnections = supernodes.reduce(
      (max, s) => Math.max(max, s.connectionCount),
      0
    );

    // Estimate query cost
    const estimatedCost = this.estimateQueryCost({
      startNodeCount: startEntityIds.length,
      maxHops,
      maxSupernodeConnections,
      hasSupernode,
    });

    // Determine optimization strategy
    let strategy: QueryPlan['strategy'];
    let warning: string | undefined;

    if (estimatedCost > this.config.maxQueryCost && this.config.blockExpensiveQueries) {
      strategy = 'blocked';
      warning = `Query blocked: estimated cost (${estimatedCost}) exceeds maximum (${this.config.maxQueryCost})`;
    } else if (!hasSupernode && estimatedCost < 1000) {
      strategy = 'direct';
    } else if (hasSupernode && maxSupernodeConnections > 10000) {
      strategy = 'sampled';
      warning = `Large supernode detected (${maxSupernodeConnections} connections). Results are sampled.`;
    } else if (hasSupernode) {
      strategy = 'paginated';
      warning = `Supernode detected (${maxSupernodeConnections} connections). Results are paginated.`;
    } else {
      strategy = 'paginated';
    }

    // Build optimized query
    const { query, parameters } = this.buildOptimizedQuery({
      startEntityIds,
      maxHops: Math.min(maxHops, this.config.maxTraversalDepth),
      relationshipTypes,
      limit,
      tenantId,
      strategy,
      samplingRate: strategy === 'sampled' ? this.config.samplingRate : 1,
    });

    return {
      strategy,
      originalQuery: this.buildOriginalQuery(params),
      optimizedQuery: query,
      parameters,
      estimatedCost,
      warning,
      pagination:
        strategy === 'paginated' || strategy === 'sampled'
          ? {
            limit,
            offset: 0,
            hasMore: true,
            totalEstimate: estimatedCost,
          }
          : undefined,
    };
  }

  /**
   * Estimate query cost based on graph structure
   */
  private estimateQueryCost(params: {
    startNodeCount: number;
    maxHops: number;
    maxSupernodeConnections: number;
    hasSupernode: boolean;
  }): number {
    const { startNodeCount, maxHops, maxSupernodeConnections, hasSupernode } = params;

    // Base cost: starting nodes
    let cost = startNodeCount * 10;

    // Hop multiplier (exponential growth)
    for (let hop = 1; hop <= maxHops; hop++) {
      if (hasSupernode) {
        // Supernode causes explosion
        cost *= Math.min(maxSupernodeConnections * 0.1, 100);
      } else {
        // Normal average degree assumption (~10)
        cost *= 10;
      }
    }

    return Math.round(cost);
  }

  /**
   * Build the original (unoptimized) query for reference
   */
  private buildOriginalQuery(params: {
    startEntityIds: string[];
    maxHops: number;
    relationshipTypes?: string[];
    limit?: number;
    tenantId?: string;
  }): string {
    const relFilter = params.relationshipTypes?.length
      ? `:${params.relationshipTypes.join('|')}`
      : '';

    return `
      MATCH (start:Entity)
      WHERE start.id IN $startIds
        ${params.tenantId ? 'AND start.tenantId = $tenantId' : ''}
      CALL apoc.path.subgraphAll(start, {
        maxLevel: ${params.maxHops},
        relationshipFilter: '${relFilter}>'
      }) YIELD nodes, relationships
      UNWIND nodes AS n
      RETURN DISTINCT n
      ${params.limit ? `LIMIT ${params.limit}` : ''}
    `.trim();
  }

  /**
   * Build optimized query based on strategy
   */
  private buildOptimizedQuery(params: {
    startEntityIds: string[];
    maxHops: number;
    relationshipTypes?: string[];
    limit: number;
    tenantId?: string;
    strategy: QueryPlan['strategy'];
    samplingRate: number;
  }): { query: string; parameters: Record<string, unknown> } {
    const {
      startEntityIds,
      maxHops,
      relationshipTypes,
      limit,
      tenantId,
      strategy,
      samplingRate,
    } = params;

    const relFilter = relationshipTypes?.length
      ? `:${relationshipTypes.join('|')}`
      : '';

    const parameters: Record<string, unknown> = {
      startIds: startEntityIds,
      limit,
    };
    if (tenantId) {
      parameters.tenantId = tenantId;
    }

    let query: string;

    switch (strategy) {
      case 'blocked':
        query = 'RETURN null AS blocked';
        break;

      case 'sampled':
        // Use random sampling for very large supernodes
        query = `
          MATCH (start:Entity)
          WHERE start.id IN $startIds
            ${tenantId ? 'AND start.tenantId = $tenantId' : ''}
          WITH start
          MATCH (start)-[r${relFilter}*1..${maxHops}]-(related:Entity)
          WHERE rand() < ${samplingRate}
            ${tenantId ? 'AND related.tenantId = $tenantId' : ''}
          RETURN DISTINCT related
          ORDER BY related.connectionCount DESC
          LIMIT $limit
        `.trim();
        break;

      case 'paginated':
        // Use ordered pagination
        query = `
          MATCH (start:Entity)
          WHERE start.id IN $startIds
            ${tenantId ? 'AND start.tenantId = $tenantId' : ''}
          WITH start
          MATCH (start)-[r${relFilter}*1..${maxHops}]-(related:Entity)
          WHERE related.id <> start.id
            ${tenantId ? 'AND related.tenantId = $tenantId' : ''}
          WITH DISTINCT related
          ORDER BY related.connectionCount DESC, related.id
          LIMIT $limit
          RETURN related
        `.trim();
        break;

      case 'cached':
        // Use pre-computed cache (placeholder - would query Redis)
        query = `
          MATCH (start:Entity)
          WHERE start.id IN $startIds
          MATCH (start)-[:HAS_CACHED_NEIGHBOR]->(cached:CachedNeighbor)
          RETURN cached.entities AS related
          LIMIT $limit
        `.trim();
        break;

      case 'direct':
      default:
        // Standard query for non-supernode cases
        query = `
          MATCH (start:Entity)
          WHERE start.id IN $startIds
            ${tenantId ? 'AND start.tenantId = $tenantId' : ''}
          CALL apoc.path.subgraphNodes(start, {
            maxLevel: ${maxHops},
            relationshipFilter: '${relFilter}>'
          }) YIELD node
          WHERE node.id <> start.id
            ${tenantId ? 'AND node.tenantId = $tenantId' : ''}
          RETURN DISTINCT node AS related
          LIMIT $limit
        `.trim();
    }

    return { query, parameters };
  }

  /**
   * Get paginated neighbors for a supernode
   */
  async getPaginatedNeighbors(params: {
    entityId: string;
    relationshipType?: string;
    direction?: 'in' | 'out' | 'both';
    limit: number;
    offset: number;
    tenantId?: string;
  }): Promise<{
    neighbors: Array<{ id: string; type: string; label: string }>;
    hasMore: boolean;
    total: number;
  }> {
    const {
      entityId,
      relationshipType,
      direction = 'both',
      limit,
      offset,
      tenantId,
    } = params;

    const session = this.neo4j.session();
    try {
      // Build direction-aware pattern
      let pattern: string;
      switch (direction) {
        case 'in':
          pattern = '<-[r]-';
          break;
        case 'out':
          pattern = '-[r]->';
          break;
        default:
          pattern = '-[r]-';
      }

      if (relationshipType) {
        pattern = pattern.replace('[r]', `[r:${relationshipType}]`);
      }

      const result = await session.run(
        `
        MATCH (e:Entity {id: $entityId})${pattern}(neighbor:Entity)
        WHERE neighbor.id <> e.id
          ${tenantId ? 'AND neighbor.tenantId = $tenantId' : ''}
        WITH neighbor
        ORDER BY neighbor.connectionCount DESC, neighbor.id
        SKIP $offset
        LIMIT $limit + 1
        RETURN neighbor.id AS id,
               neighbor.type AS type,
               neighbor.label AS label
        `,
        { entityId, offset, limit, tenantId }
      );

      const neighbors = result.records.slice(0, limit).map((record: any) => ({
        id: record.get('id'),
        type: record.get('type'),
        label: record.get('label'),
      }));

      const hasMore = result.records.length > limit;

      // Get total count (cached if available)
      const info = await this.getSupernodeInfo(entityId);
      const total = info?.connectionCount || neighbors.length;

      return { neighbors, hasMore, total };
    } finally {
      await session.close();
    }
  }

  /**
   * Pre-compute and cache supernode statistics
   */
  async precomputeSupernodeStats(topN: number = 100): Promise<number> {
    serviceLogger.info('Starting supernode pre-computation', { topN });

    const session = this.neo4j.session();
    try {
      const result = await session.run(
        `
        MATCH (e:Entity)
        WITH e, size((e)--()) AS connectionCount
        WHERE connectionCount >= $threshold
        RETURN e.id AS entityId
        ORDER BY connectionCount DESC
        LIMIT $topN
        `,
        { threshold: this.config.supernodeThreshold, topN }
      );

      const entityIds = result.records.map((r: any) => r.get('entityId'));

      // BOLT OPTIMIZATION: Use batched detectSupernodes to pre-compute and cache stats for all entities at once
      const supernodes = await this.detectSupernodes(entityIds);
      const processed = entityIds.length;

      serviceLogger.info('Supernode pre-computation complete', { processed });
      return processed;
    } finally {
      await session.close();
    }
  }

  /**
   * Clear supernode caches
   */
  async clearCache(): Promise<void> {
    this.supernodeCache.clear();
    if (this.redis) {
      const keys = await this.redis.keys('supernode:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
    serviceLogger.info('Supernode cache cleared');
  }
}

// Export factory function
export function createSupernodeOptimizer(
  neo4jDriver: Driver,
  redisClient?: Redis,
  config?: Partial<SupernodeQueryConfig>
): SupernodeQueryOptimizer {
  return new SupernodeQueryOptimizer(neo4jDriver, redisClient, config);
}

export default SupernodeQueryOptimizer;
