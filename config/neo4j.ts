/**
 * Neo4j Configuration and Optimization
 *
 * This module provides:
 * - Connection pooling configuration
 * - Query result caching
 * - Index management
 * - Query optimization utilities
 */

import { Driver, Session, auth, driver as createDriver } from 'neo4j-driver';
import pino from 'pino';

const logger = pino();

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;

  // Connection pooling configuration
  maxConnectionPoolSize?: number;
  connectionAcquisitionTimeout?: number;
  maxTransactionRetryTime?: number;
  connectionTimeout?: number;

  // Query optimization
  enableQueryCache?: boolean;
  queryCacheTTL?: number;
  slowQueryThreshold?: number;
}

export interface QueryCacheEntry {
  result: any;
  timestamp: number;
  ttl: number;
}

export interface IndexDefinition {
  label: string;
  properties: string[];
  type?: 'BTREE' | 'FULLTEXT' | 'RANGE' | 'TEXT';
}

export interface ConstraintDefinition {
  label: string;
  properties: string[];
  type: 'UNIQUE' | 'NODE_KEY' | 'EXISTS';
}

/**
 * Recommended Neo4j configuration for production
 */
export const defaultNeo4jConfig: Partial<Neo4jConfig> = {
  // Connection pool settings - optimized for typical workloads
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 60000, // 60 seconds
  maxTransactionRetryTime: 30000, // 30 seconds
  connectionTimeout: 30000, // 30 seconds

  // Query caching
  enableQueryCache: true,
  queryCacheTTL: 300000, // 5 minutes
  slowQueryThreshold: 100, // 100ms
};

/**
 * Create optimized Neo4j driver with connection pooling
 */
export function createOptimizedNeo4jDriver(config: Neo4jConfig): Driver {
  const driverConfig: any = {
    maxConnectionPoolSize: config.maxConnectionPoolSize ?? defaultNeo4jConfig.maxConnectionPoolSize,
    connectionAcquisitionTimeout: config.connectionAcquisitionTimeout ?? defaultNeo4jConfig.connectionAcquisitionTimeout,
    maxTransactionRetryTime: config.maxTransactionRetryTime ?? defaultNeo4jConfig.maxTransactionRetryTime,
    connectionTimeout: config.connectionTimeout ?? defaultNeo4jConfig.connectionTimeout,

    // Enable logging for connection pool events
    logging: {
      level: process.env.NEO4J_LOG_LEVEL || 'info',
      logger: (level: string, message: string) => {
        logger[level as keyof typeof logger]?.(message);
      },
    },
  };

  const authToken = auth.basic(config.username, config.password);
  return createDriver(config.uri, authToken, driverConfig);
}

/**
 * Query Cache Manager for Neo4j
 * Implements in-memory LRU cache for query results
 */
export class Neo4jQueryCache {
  private cache: Map<string, QueryCacheEntry>;
  private maxSize: number;
  private defaultTTL: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 1000, defaultTTL: number = 300000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate cache key from query and parameters
   */
  private getCacheKey(cypher: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${cypher}:${paramsStr}`;
  }

  /**
   * Get cached query result
   */
  get(cypher: string, params?: any): any | null {
    const key = this.getCacheKey(cypher, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.result;
  }

  /**
   * Cache query result
   */
  set(cypher: string, params: any, result: any, ttl?: number): void {
    const key = this.getCacheKey(cypher, params);

    // Implement LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      maxSize: this.maxSize,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

/**
 * Recommended indexes for Entity nodes
 */
export const ENTITY_INDEXES: IndexDefinition[] = [
  // Single property indexes
  { label: 'Entity', properties: ['id'] },
  { label: 'Entity', properties: ['type'] },
  { label: 'Entity', properties: ['tenantId'] },
  { label: 'Entity', properties: ['createdAt'] },
  { label: 'Entity', properties: ['updatedAt'] },
  { label: 'Entity', properties: ['confidence'] },
  { label: 'Entity', properties: ['canonicalId'] },

  // Composite indexes for common query patterns
  { label: 'Entity', properties: ['tenantId', 'type'] },
  { label: 'Entity', properties: ['tenantId', 'createdAt'] },
  { label: 'Entity', properties: ['type', 'confidence'] },

  // Temporal indexes
  { label: 'Entity', properties: ['validFrom'] },
  { label: 'Entity', properties: ['validTo'] },

  // Full-text search
  { label: 'Entity', properties: ['name'], type: 'FULLTEXT' },
  { label: 'Entity', properties: ['description'], type: 'FULLTEXT' },
];

/**
 * Recommended indexes for Relationship edges
 */
export const RELATIONSHIP_INDEXES: IndexDefinition[] = [
  { label: 'RELATED_TO', properties: ['type'] },
  { label: 'RELATED_TO', properties: ['tenantId'] },
  { label: 'RELATED_TO', properties: ['createdAt'] },
  { label: 'RELATED_TO', properties: ['confidence'] },
  { label: 'RELATED_TO', properties: ['tenantId', 'type'] },
  { label: 'RELATED_TO', properties: ['validFrom'] },
  { label: 'RELATED_TO', properties: ['validTo'] },
];

/**
 * Recommended indexes for Investigation nodes
 */
export const INVESTIGATION_INDEXES: IndexDefinition[] = [
  { label: 'Investigation', properties: ['id'] },
  { label: 'Investigation', properties: ['status'] },
  { label: 'Investigation', properties: ['tenantId'] },
  { label: 'Investigation', properties: ['priority'] },
  { label: 'Investigation', properties: ['createdAt'] },
  { label: 'Investigation', properties: ['tenantId', 'status'] },
  { label: 'Investigation', properties: ['name'], type: 'FULLTEXT' },
];

/**
 * Recommended indexes for User nodes
 */
export const USER_INDEXES: IndexDefinition[] = [
  { label: 'User', properties: ['id'] },
  { label: 'User', properties: ['email'] },
  { label: 'User', properties: ['tenantId'] },
  { label: 'User', properties: ['role'] },
  { label: 'User', properties: ['tenantId', 'email'] },
];

/**
 * Recommended constraints
 */
export const RECOMMENDED_CONSTRAINTS: ConstraintDefinition[] = [
  // Uniqueness constraints
  { label: 'Entity', properties: ['id'], type: 'UNIQUE' },
  { label: 'Entity', properties: ['id', 'tenantId'], type: 'NODE_KEY' },
  { label: 'Investigation', properties: ['id'], type: 'UNIQUE' },
  { label: 'User', properties: ['email', 'tenantId'], type: 'UNIQUE' },
  { label: 'RELATED_TO', properties: ['id'], type: 'UNIQUE' },
];

/**
 * Apply indexes to Neo4j database
 */
export async function applyIndexes(
  session: Session,
  indexes: IndexDefinition[],
): Promise<void> {
  for (const index of indexes) {
    try {
      const indexName = `idx_${index.label.toLowerCase()}_${index.properties.join('_')}`;
      const properties = index.properties.map(p => `n.${p}`).join(', ');

      let query: string;
      if (index.type === 'FULLTEXT') {
        query = `CREATE FULLTEXT INDEX ${indexName} IF NOT EXISTS FOR (n:${index.label}) ON EACH [${properties}]`;
      } else {
        query = `CREATE INDEX ${indexName} IF NOT EXISTS FOR (n:${index.label}) ON (${properties})`;
      }

      await session.run(query);
      logger.info(`Created index: ${indexName}`);
    } catch (error) {
      logger.error(`Failed to create index for ${index.label}:`, error);
    }
  }
}

/**
 * Apply constraints to Neo4j database
 */
export async function applyConstraints(
  session: Session,
  constraints: ConstraintDefinition[],
): Promise<void> {
  for (const constraint of constraints) {
    try {
      const constraintName = `constraint_${constraint.label.toLowerCase()}_${constraint.properties.join('_')}`;
      const properties = constraint.properties.map(p => `n.${p}`).join(', ');

      let query: string;
      if (constraint.type === 'UNIQUE') {
        query = `CREATE CONSTRAINT ${constraintName} IF NOT EXISTS FOR (n:${constraint.label}) REQUIRE n.${constraint.properties[0]} IS UNIQUE`;
      } else if (constraint.type === 'NODE_KEY') {
        query = `CREATE CONSTRAINT ${constraintName} IF NOT EXISTS FOR (n:${constraint.label}) REQUIRE (${properties}) IS NODE KEY`;
      } else {
        query = `CREATE CONSTRAINT ${constraintName} IF NOT EXISTS FOR (n:${constraint.label}) REQUIRE n.${constraint.properties[0]} IS NOT NULL`;
      }

      await session.run(query);
      logger.info(`Created constraint: ${constraintName}`);
    } catch (error) {
      logger.error(`Failed to create constraint for ${constraint.label}:`, error);
    }
  }
}

/**
 * Analyze query performance using PROFILE
 */
export async function profileQuery(
  session: Session,
  cypher: string,
  params?: any,
): Promise<any> {
  const profiledQuery = `PROFILE ${cypher}`;
  const result = await session.run(profiledQuery, params);
  return result.summary.profile;
}

/**
 * Get query execution plan using EXPLAIN
 */
export async function explainQuery(
  session: Session,
  cypher: string,
  params?: any,
): Promise<any> {
  const explainedQuery = `EXPLAIN ${cypher}`;
  const result = await session.run(explainedQuery, params);
  return result.summary.plan;
}

/**
 * Common query optimization patterns
 */
export const QUERY_OPTIMIZATION_TIPS = {
  // Use parameters instead of string concatenation
  useParameters: true,

  // Always filter by tenantId first for multi-tenant queries
  tenantIdFirst: true,

  // Use LIMIT for queries that might return many results
  useLimit: true,

  // Use WITH to break complex queries into steps
  useWith: true,

  // Avoid cartesian products (multiple MATCH without connection)
  avoidCartesian: true,

  // Use indexes - check with :schema in Neo4j Browser
  useIndexes: true,

  // Profile slow queries to identify bottlenecks
  profileSlowQueries: true,
};

export default {
  createOptimizedNeo4jDriver,
  Neo4jQueryCache,
  defaultNeo4jConfig,
  ENTITY_INDEXES,
  RELATIONSHIP_INDEXES,
  INVESTIGATION_INDEXES,
  USER_INDEXES,
  RECOMMENDED_CONSTRAINTS,
  applyIndexes,
  applyConstraints,
  profileQuery,
  explainQuery,
  QUERY_OPTIMIZATION_TIPS,
};
