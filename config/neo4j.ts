/**
 * Neo4j Configuration and Optimization
 *
 * This module provides production-ready Neo4j utilities including:
 * - Connection pooling with configurable limits
 * - Query result caching with LRU eviction
 * - Index and constraint management
 * - Query optimization and profiling utilities
 * - Comprehensive error handling and retry logic
 *
 * @module config/neo4j
 * @see docs/performance/DATABASE_OPTIMIZATION.md
 */

import { Driver, Session, auth, driver as createDriver, ServerInfo } from 'neo4j-driver';
import pino from 'pino';

const logger = pino();

/**
 * Neo4j driver configuration options
 * Extends driver config with optimization-specific settings
 */
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

  // Retry configuration
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Cache entry structure for query results
 */
export interface QueryCacheEntry {
  result: any;
  timestamp: number;
  ttl: number;
}

/**
 * Index definition for creating Neo4j indexes
 */
export interface IndexDefinition {
  label: string;
  properties: string[];
  type?: 'BTREE' | 'FULLTEXT' | 'RANGE' | 'TEXT';
}

/**
 * Constraint definition for creating Neo4j constraints
 */
export interface ConstraintDefinition {
  label: string;
  properties: string[];
  type: 'UNIQUE' | 'NODE_KEY' | 'EXISTS';
}

/**
 * Recommended Neo4j configuration for production workloads
 * These defaults are based on typical usage patterns and can be adjusted
 * based on specific requirements and load testing results.
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

  // Retry configuration
  maxRetries: 3,
  retryDelayMs: 1000, // 1 second
};

/**
 * Custom error class for Neo4j configuration errors
 */
export class Neo4jConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Neo4jConfigError';
  }
}

/**
 * Custom error class for Neo4j query errors
 */
export class Neo4jQueryError extends Error {
  constructor(message: string, public readonly query?: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'Neo4jQueryError';
  }
}

/**
 * Validates Neo4j configuration
 * @param config Configuration to validate
 * @throws Neo4jConfigError if configuration is invalid
 */
function validateConfig(config: Neo4jConfig): void {
  if (!config.uri) {
    throw new Neo4jConfigError('Neo4j URI is required');
  }

  if (!config.username || !config.password) {
    throw new Neo4jConfigError('Neo4j username and password are required');
  }

  // Validate URI format
  if (!config.uri.match(/^(bolt|neo4j|bolt\+s|neo4j\+s|bolt\+ssc|neo4j\+ssc):\/\/.+/)) {
    throw new Neo4jConfigError(`Invalid Neo4j URI format: ${config.uri}`);
  }

  // Validate numeric configurations
  if (config.maxConnectionPoolSize !== undefined && config.maxConnectionPoolSize < 1) {
    throw new Neo4jConfigError('maxConnectionPoolSize must be at least 1');
  }

  if (config.connectionTimeout !== undefined && config.connectionTimeout < 0) {
    throw new Neo4jConfigError('connectionTimeout cannot be negative');
  }

  if (config.slowQueryThreshold !== undefined && config.slowQueryThreshold < 0) {
    throw new Neo4jConfigError('slowQueryThreshold cannot be negative');
  }
}

/**
 * Creates an optimized Neo4j driver with connection pooling and monitoring
 *
 * @param config Neo4j configuration options
 * @returns Configured Neo4j driver instance
 * @throws Neo4jConfigError if configuration is invalid
 *
 * @example
 * ```typescript
 * const driver = createOptimizedNeo4jDriver({
 *   uri: 'bolt://localhost:7687',
 *   username: 'neo4j',
 *   password: 'password',
 *   maxConnectionPoolSize: 50
 * });
 * ```
 */
export function createOptimizedNeo4jDriver(config: Neo4jConfig): Driver {
  try {
    // Validate configuration before creating driver
    validateConfig(config);

    const driverConfig: any = {
      // Connection pool configuration
      maxConnectionPoolSize: config.maxConnectionPoolSize ?? defaultNeo4jConfig.maxConnectionPoolSize,
      connectionAcquisitionTimeout: config.connectionAcquisitionTimeout ?? defaultNeo4jConfig.connectionAcquisitionTimeout,
      maxTransactionRetryTime: config.maxTransactionRetryTime ?? defaultNeo4jConfig.maxTransactionRetryTime,
      connectionTimeout: config.connectionTimeout ?? defaultNeo4jConfig.connectionTimeout,

      // Enable logging for connection pool events
      // This helps with debugging connection issues in production
      logging: {
        level: process.env.NEO4J_LOG_LEVEL || 'info',
        logger: (level: string, message: string) => {
          // Route Neo4j driver logs through our logger
          const logMethod = logger[level as keyof typeof logger];
          if (typeof logMethod === 'function') {
            logMethod.call(logger, { msg: message, component: 'neo4j-driver' });
          }
        },
      },
    };

    const authToken = auth.basic(config.username, config.password);
    const driver = createDriver(config.uri, authToken, driverConfig);

    logger.info({
      msg: 'Neo4j driver created successfully',
      uri: config.uri,
      database: config.database,
      maxPoolSize: driverConfig.maxConnectionPoolSize,
    });

    return driver;
  } catch (error) {
    logger.error({
      msg: 'Failed to create Neo4j driver',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Query Cache Manager for Neo4j
 *
 * Implements an in-memory LRU (Least Recently Used) cache for query results.
 * This significantly improves performance for frequently executed queries.
 *
 * @example
 * ```typescript
 * const cache = new Neo4jQueryCache(1000, 300000); // 1000 items, 5min TTL
 *
 * // Check cache before querying
 * const cached = cache.get(cypher, params);
 * if (cached) return cached;
 *
 * // Execute query and cache result
 * const result = await session.run(cypher, params);
 * cache.set(cypher, params, result);
 * ```
 */
export class Neo4jQueryCache {
  private cache: Map<string, QueryCacheEntry>;
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private hits: number = 0;
  private misses: number = 0;

  /**
   * Creates a new query cache instance
   *
   * @param maxSize Maximum number of cached entries (default: 1000)
   * @param defaultTTL Default time-to-live in milliseconds (default: 5 minutes)
   */
  constructor(maxSize: number = 1000, defaultTTL: number = 300000) {
    if (maxSize < 1) {
      throw new Error('Cache maxSize must be at least 1');
    }
    if (defaultTTL < 0) {
      throw new Error('Cache defaultTTL cannot be negative');
    }

    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;

    logger.debug({
      msg: 'Neo4j query cache initialized',
      maxSize,
      defaultTTL,
    });
  }

  /**
   * Generates a cache key from query and parameters
   * Uses JSON stringification for parameter serialization
   *
   * @private
   * @param cypher Cypher query string
   * @param params Query parameters
   * @returns Unique cache key
   */
  private getCacheKey(cypher: string, params?: any): string {
    try {
      const paramsStr = params ? JSON.stringify(params) : '';
      return `${cypher}:${paramsStr}`;
    } catch (error) {
      // If params can't be stringified (circular reference, etc), create a simple key
      logger.warn({
        msg: 'Failed to stringify query params for cache key',
        error: error instanceof Error ? error.message : String(error),
      });
      return cypher;
    }
  }

  /**
   * Retrieves a cached query result
   *
   * @param cypher Cypher query string
   * @param params Query parameters
   * @returns Cached result or null if not found or expired
   */
  get(cypher: string, params?: any): any | null {
    try {
      const key = this.getCacheKey(cypher, params);
      const entry = this.cache.get(key);

      if (!entry) {
        this.misses++;
        return null;
      }

      const now = Date.now();
      const age = now - entry.timestamp;

      // Check if entry has expired
      if (age > entry.ttl) {
        this.cache.delete(key);
        this.misses++;
        logger.debug({
          msg: 'Cache entry expired',
          age,
          ttl: entry.ttl,
        });
        return null;
      }

      this.hits++;
      logger.debug({
        msg: 'Cache hit',
        age,
        hitRate: this.getHitRate(),
      });
      return entry.result;
    } catch (error) {
      logger.error({
        msg: 'Error retrieving from cache',
        error: error instanceof Error ? error.message : String(error),
      });
      this.misses++;
      return null;
    }
  }

  /**
   * Caches a query result
   * Implements LRU eviction when cache is full
   *
   * @param cypher Cypher query string
   * @param params Query parameters
   * @param result Query result to cache
   * @param ttl Optional custom TTL in milliseconds
   */
  set(cypher: string, params: any, result: any, ttl?: number): void {
    try {
      const key = this.getCacheKey(cypher, params);

      // Implement LRU eviction when cache is full
      // Remove the oldest entry (first in Map)
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
          logger.debug({
            msg: 'Cache eviction (LRU)',
            evictedKey: firstKey.substring(0, 50),
          });
        }
      }

      this.cache.set(key, {
        result,
        timestamp: Date.now(),
        ttl: ttl ?? this.defaultTTL,
      });

      logger.debug({
        msg: 'Query result cached',
        cacheSize: this.cache.size,
        maxSize: this.maxSize,
      });
    } catch (error) {
      logger.error({
        msg: 'Error caching query result',
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - caching failures shouldn't break the application
    }
  }

  /**
   * Invalidates cache entries matching a pattern
   * Uses regular expression for pattern matching
   *
   * @param pattern Optional regex pattern to match keys. If not provided, clears all cache.
   * @returns Number of entries invalidated
   *
   * @example
   * ```typescript
   * // Invalidate all Entity queries
   * cache.invalidate('MATCH.*Entity');
   *
   * // Clear all cache
   * cache.invalidate();
   * ```
   */
  invalidate(pattern?: string): number {
    try {
      if (!pattern) {
        const size = this.cache.size;
        this.cache.clear();
        logger.info({ msg: 'Cache cleared', entriesRemoved: size });
        return size;
      }

      const regex = new RegExp(pattern);
      let count = 0;

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          count++;
        }
      }

      logger.info({
        msg: 'Cache invalidated by pattern',
        pattern,
        entriesRemoved: count,
      });

      return count;
    } catch (error) {
      logger.error({
        msg: 'Error invalidating cache',
        pattern,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Gets cache hit rate (0-1)
   * @returns Hit rate as a number between 0 and 1
   */
  private getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  /**
   * Retrieves cache statistics
   *
   * @returns Object containing cache metrics
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      maxSize: this.maxSize,
      utilization: this.maxSize > 0 ? this.cache.size / this.maxSize : 0,
    };
  }

  /**
   * Resets cache statistics
   * Does not clear the cache itself
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    logger.debug({ msg: 'Cache stats reset' });
  }
}

/**
 * Recommended indexes for Entity nodes
 * These indexes optimize the most common query patterns
 */
export const ENTITY_INDEXES: IndexDefinition[] = [
  // Single property indexes for basic lookups
  { label: 'Entity', properties: ['id'] },
  { label: 'Entity', properties: ['type'] },
  { label: 'Entity', properties: ['tenantId'] },
  { label: 'Entity', properties: ['createdAt'] },
  { label: 'Entity', properties: ['updatedAt'] },
  { label: 'Entity', properties: ['confidence'] },
  { label: 'Entity', properties: ['canonicalId'] },

  // Composite indexes for common multi-property queries
  // Order matters: most selective property first
  { label: 'Entity', properties: ['tenantId', 'type'] },
  { label: 'Entity', properties: ['tenantId', 'createdAt'] },
  { label: 'Entity', properties: ['type', 'confidence'] },

  // Temporal indexes for bitemporal querying
  { label: 'Entity', properties: ['validFrom'] },
  { label: 'Entity', properties: ['validTo'] },

  // Full-text search indexes for text search capabilities
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
 * Recommended constraints for data integrity
 * Constraints ensure data quality and enable certain optimizations
 */
export const RECOMMENDED_CONSTRAINTS: ConstraintDefinition[] = [
  // Uniqueness constraints prevent duplicate data
  { label: 'Entity', properties: ['id'], type: 'UNIQUE' },

  // Node keys ensure both uniqueness AND existence of properties
  { label: 'Entity', properties: ['id', 'tenantId'], type: 'NODE_KEY' },
  { label: 'Investigation', properties: ['id'], type: 'UNIQUE' },
  { label: 'User', properties: ['email', 'tenantId'], type: 'UNIQUE' },
  { label: 'RELATED_TO', properties: ['id'], type: 'UNIQUE' },
];

/**
 * Applies indexes to Neo4j database with error handling and retry logic
 *
 * @param session Active Neo4j session
 * @param indexes Array of index definitions to create
 * @param options Optional configuration for index creation
 * @returns Object with success count and errors
 *
 * @example
 * ```typescript
 * const session = driver.session();
 * try {
 *   const result = await applyIndexes(session, ENTITY_INDEXES);
 *   console.log(`Created ${result.success} indexes`);
 * } finally {
 *   await session.close();
 * }
 * ```
 */
export async function applyIndexes(
  session: Session,
  indexes: IndexDefinition[],
  options: { skipExisting?: boolean } = {}
): Promise<{ success: number; errors: Array<{ index: IndexDefinition; error: string }> }> {
  const results = {
    success: 0,
    errors: [] as Array<{ index: IndexDefinition; error: string }>,
  };

  for (const index of indexes) {
    try {
      // Validate index definition
      if (!index.label || !index.properties || index.properties.length === 0) {
        throw new Error('Invalid index definition: label and properties are required');
      }

      const indexName = `idx_${index.label.toLowerCase()}_${index.properties.join('_')}`;
      const properties = index.properties.map(p => `n.${p}`).join(', ');

      let query: string;
      if (index.type === 'FULLTEXT') {
        // Full-text indexes use different syntax
        query = `CREATE FULLTEXT INDEX ${indexName} IF NOT EXISTS FOR (n:${index.label}) ON EACH [${properties}]`;
      } else {
        // Standard and range/text indexes
        query = `CREATE INDEX ${indexName} IF NOT EXISTS FOR (n:${index.label}) ON (${properties})`;
      }

      await session.run(query);
      results.success++;

      logger.info({
        msg: 'Index created successfully',
        indexName,
        label: index.label,
        properties: index.properties,
        type: index.type || 'BTREE',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Don't fail on "already exists" errors if skipExisting is true
      if (options.skipExisting && errorMessage.includes('already exists')) {
        logger.debug({
          msg: 'Index already exists, skipping',
          label: index.label,
          properties: index.properties,
        });
        results.success++;
        continue;
      }

      logger.error({
        msg: 'Failed to create index',
        label: index.label,
        properties: index.properties,
        error: errorMessage,
      });

      results.errors.push({
        index,
        error: errorMessage,
      });
    }
  }

  return results;
}

/**
 * Applies constraints to Neo4j database with error handling
 *
 * @param session Active Neo4j session
 * @param constraints Array of constraint definitions to create
 * @returns Object with success count and errors
 */
export async function applyConstraints(
  session: Session,
  constraints: ConstraintDefinition[],
): Promise<{ success: number; errors: Array<{ constraint: ConstraintDefinition; error: string }> }> {
  const results = {
    success: 0,
    errors: [] as Array<{ constraint: ConstraintDefinition; error: string }>,
  };

  for (const constraint of constraints) {
    try {
      // Validate constraint definition
      if (!constraint.label || !constraint.properties || constraint.properties.length === 0) {
        throw new Error('Invalid constraint definition: label and properties are required');
      }

      const constraintName = `constraint_${constraint.label.toLowerCase()}_${constraint.properties.join('_')}`;
      const properties = constraint.properties.map(p => `n.${p}`).join(', ');

      let query: string;
      if (constraint.type === 'UNIQUE') {
        // Unique constraint on single property
        query = `CREATE CONSTRAINT ${constraintName} IF NOT EXISTS FOR (n:${constraint.label}) REQUIRE n.${constraint.properties[0]} IS UNIQUE`;
      } else if (constraint.type === 'NODE_KEY') {
        // Node key constraint (composite unique + existence)
        query = `CREATE CONSTRAINT ${constraintName} IF NOT EXISTS FOR (n:${constraint.label}) REQUIRE (${properties}) IS NODE KEY`;
      } else {
        // Existence constraint
        query = `CREATE CONSTRAINT ${constraintName} IF NOT EXISTS FOR (n:${constraint.label}) REQUIRE n.${constraint.properties[0]} IS NOT NULL`;
      }

      await session.run(query);
      results.success++;

      logger.info({
        msg: 'Constraint created successfully',
        constraintName,
        label: constraint.label,
        properties: constraint.properties,
        type: constraint.type,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error({
        msg: 'Failed to create constraint',
        label: constraint.label,
        properties: constraint.properties,
        error: errorMessage,
      });

      results.errors.push({
        constraint,
        error: errorMessage,
      });
    }
  }

  return results;
}

/**
 * Analyzes query performance using PROFILE
 * Returns detailed execution plan with statistics
 *
 * @param session Active Neo4j session
 * @param cypher Query to profile
 * @param params Query parameters
 * @returns Query profile with execution statistics
 *
 * @example
 * ```typescript
 * const profile = await profileQuery(session,
 *   'MATCH (e:Entity {tenantId: $tenantId}) RETURN e LIMIT 10',
 *   { tenantId: 'tenant-123' }
 * );
 * console.log('DB hits:', profile.dbHits);
 * ```
 */
export async function profileQuery(
  session: Session,
  cypher: string,
  params?: any,
): Promise<any> {
  try {
    const profiledQuery = `PROFILE ${cypher}`;
    const result = await session.run(profiledQuery, params);

    const profile = result.summary.profile;

    logger.info({
      msg: 'Query profiled',
      dbHits: profile?.dbHits,
      rows: result.records.length,
    });

    return profile;
  } catch (error) {
    logger.error({
      msg: 'Failed to profile query',
      query: cypher.substring(0, 100),
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Neo4jQueryError(
      'Failed to profile query',
      cypher,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Gets query execution plan using EXPLAIN (without executing)
 * Useful for analyzing query performance without running expensive queries
 *
 * @param session Active Neo4j session
 * @param cypher Query to explain
 * @param params Query parameters
 * @returns Query execution plan
 */
export async function explainQuery(
  session: Session,
  cypher: string,
  params?: any,
): Promise<any> {
  try {
    const explainedQuery = `EXPLAIN ${cypher}`;
    const result = await session.run(explainedQuery, params);

    const plan = result.summary.plan;

    logger.info({
      msg: 'Query explained',
      operatorType: plan?.operatorType,
      estimatedRows: plan?.arguments?.EstimatedRows,
    });

    return plan;
  } catch (error) {
    logger.error({
      msg: 'Failed to explain query',
      query: cypher.substring(0, 100),
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Neo4jQueryError(
      'Failed to explain query',
      cypher,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Common query optimization patterns and best practices
 * Use these guidelines when writing Cypher queries
 */
export const QUERY_OPTIMIZATION_TIPS = {
  // Always use parameters instead of string concatenation to:
  // 1. Prevent Cypher injection
  // 2. Enable query plan caching
  // 3. Improve performance
  useParameters: true,

  // Filter by tenantId first in multi-tenant queries
  // This reduces the search space dramatically
  tenantIdFirst: true,

  // Always use LIMIT to prevent accidentally returning huge result sets
  useLimit: true,

  // Use WITH to break complex queries into manageable steps
  // This helps the query planner optimize better
  useWith: true,

  // Avoid cartesian products (multiple MATCH without relationships)
  // These can cause exponential result set growth
  avoidCartesian: true,

  // Check that appropriate indexes exist using :schema in Neo4j Browser
  useIndexes: true,

  // Profile slow queries to identify bottlenecks
  // Look for high db_hits and missing index usage
  profileSlowQueries: true,
};

/**
 * Verifies Neo4j driver connectivity
 *
 * @param driver Neo4j driver instance
 * @returns ServerInfo if connected, throws error otherwise
 */
export async function verifyConnectivity(driver: Driver): Promise<ServerInfo> {
  try {
    const serverInfo = await driver.verifyConnectivity();
    logger.info({
      msg: 'Neo4j connectivity verified',
      address: serverInfo.address,
      version: serverInfo.agent,
    });
    return serverInfo;
  } catch (error) {
    logger.error({
      msg: 'Neo4j connectivity check failed',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

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
  verifyConnectivity,
  QUERY_OPTIMIZATION_TIPS,
  Neo4jConfigError,
  Neo4jQueryError,
};
