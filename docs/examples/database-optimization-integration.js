"use strict";
/**
 * Database Optimization Integration Examples
 *
 * This file provides complete working examples of how to integrate
 * the database optimization features into your application.
 *
 * @see docs/performance/DATABASE_OPTIMIZATION.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupOptimizedDatabases = setupOptimizedDatabases;
exports.applyDatabaseOptimizations = applyDatabaseOptimizations;
exports.setupGraphQLServer = setupGraphQLServer;
exports.queryWithCaching = queryWithCaching;
exports.setupMonitoringEndpoints = setupMonitoringEndpoints;
exports.bootstrapApplication = bootstrapApplication;
exports.advancedQueryPatterns = advancedQueryPatterns;
// Configuration imports
const neo4j_1 = require("../../config/neo4j");
const postgresql_1 = require("../../config/postgresql");
const redis_1 = require("../../config/redis");
// Middleware imports
const dataloader_1 = require("../../middleware/dataloader");
const pagination_1 = require("../../middleware/pagination");
const database_monitoring_1 = require("../../middleware/database-monitoring");
/**
 * ============================================================================
 * EXAMPLE 1: Complete Database Setup
 * ============================================================================
 *
 * This example shows how to set up all database connections with optimization
 */
async function setupOptimizedDatabases() {
    // 1. Create Neo4j driver with connection pooling
    const neo4jDriver = (0, neo4j_1.createOptimizedNeo4jDriver)({
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        username: process.env.NEO4J_USER || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'password',
        maxConnectionPoolSize: 50,
        connectionTimeout: 30000,
        slowQueryThreshold: 100,
    });
    // 2. Verify Neo4j connectivity
    try {
        const serverInfo = await neo4jDriver.verifyConnectivity();
        console.log(`Connected to Neo4j: ${serverInfo.address}`);
    }
    catch (error) {
        console.error('Failed to connect to Neo4j:', error);
        throw error;
    }
    // 3. Create PostgreSQL connection pool
    const postgresPool = (0, postgresql_1.createOptimizedPool)({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'intelgraph_dev',
        user: process.env.POSTGRES_USER || 'intelgraph',
        password: process.env.POSTGRES_PASSWORD || 'password',
        min: 5,
        max: 20,
        idleTimeoutMillis: 30000,
        slowQueryThreshold: 100,
        enableQueryLogging: true,
    });
    // 4. Test PostgreSQL connection
    try {
        const result = await postgresPool.query('SELECT NOW()');
        console.log('Connected to PostgreSQL');
    }
    catch (error) {
        console.error('Failed to connect to PostgreSQL:', error);
        throw error;
    }
    // 5. Create Redis cache manager
    const cacheManager = (0, redis_1.createRedisCacheManager)({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: 0,
        keyPrefix: 'intelgraph:',
        enableMetrics: true,
    });
    console.log('All database connections established successfully');
    return {
        neo4jDriver,
        postgresPool,
        cacheManager,
    };
}
/**
 * ============================================================================
 * EXAMPLE 2: Applying Database Indexes and Constraints
 * ============================================================================
 *
 * This example shows how to apply all recommended indexes during migration
 */
async function applyDatabaseOptimizations(neo4jDriver, postgresPool) {
    console.log('Applying database optimizations...');
    // 1. Apply Neo4j indexes
    const neo4jSession = neo4jDriver.session();
    try {
        console.log('Creating Neo4j indexes...');
        const indexResult = await (0, neo4j_1.applyIndexes)(neo4jSession, neo4j_1.ENTITY_INDEXES, {
            skipExisting: true,
        });
        console.log(`✓ Created ${indexResult.success} Neo4j indexes`);
        if (indexResult.errors.length > 0) {
            console.warn(`⚠ ${indexResult.errors.length} index errors:`);
            indexResult.errors.forEach(err => {
                console.warn(`  - ${err.index.label}.${err.index.properties.join('.')}: ${err.error}`);
            });
        }
        // Apply constraints
        console.log('Creating Neo4j constraints...');
        const constraintResult = await (0, neo4j_1.applyConstraints)(neo4jSession, neo4j_1.RECOMMENDED_CONSTRAINTS);
        console.log(`✓ Created ${constraintResult.success} Neo4j constraints`);
        if (constraintResult.errors.length > 0) {
            console.warn(`⚠ ${constraintResult.errors.length} constraint errors:`);
            constraintResult.errors.forEach(err => {
                console.warn(`  - ${err.constraint.label}: ${err.error}`);
            });
        }
    }
    finally {
        await neo4jSession.close();
    }
    // 2. Apply PostgreSQL indexes
    const pgClient = await postgresPool.connect();
    try {
        console.log('Creating PostgreSQL indexes...');
        await (0, postgresql_1.applyCompositeIndexes)(pgClient, postgresql_1.COMPOSITE_INDEXES);
        console.log('✓ PostgreSQL indexes created');
    }
    catch (error) {
        console.error('Failed to create PostgreSQL indexes:', error);
        throw error;
    }
    finally {
        pgClient.release();
    }
    console.log('Database optimizations applied successfully');
}
/**
 * ============================================================================
 * EXAMPLE 3: GraphQL Server Setup with All Optimizations
 * ============================================================================
 *
 * This example shows how to set up a GraphQL server with all optimizations
 */
function setupGraphQLServer(neo4jDriver, postgresPool, cacheManager) {
    const { ApolloServer } = require('apollo-server-express');
    const express = require('express');
    const app = express();
    // 1. Add query tracking middleware
    app.use((0, database_monitoring_1.createQueryTrackingMiddleware)());
    // 2. Start monitoring PostgreSQL pool
    database_monitoring_1.databaseHealthMonitor.monitorPostgresPool(postgresPool, 'write');
    // 3. Create Apollo Server with optimized context
    const server = new ApolloServer({
        typeDefs: `
      type Entity {
        id: ID!
        type: String!
        name: String
        relationships: [Relationship!]!
      }

      type Relationship {
        id: ID!
        type: String!
        sourceId: ID!
        targetId: ID!
      }

      type EntityConnection {
        edges: [EntityEdge!]!
        pageInfo: PageInfo!
        totalCount: Int
      }

      type EntityEdge {
        node: Entity!
        cursor: String!
      }

      type PageInfo {
        hasNextPage: Boolean!
        hasPreviousPage: Boolean!
        startCursor: String
        endCursor: String
        totalCount: Int
      }

      type Query {
        entities(first: Int, after: String): EntityConnection!
        entity(id: ID!): Entity
      }

      type Mutation {
        createEntity(input: CreateEntityInput!): Entity!
        deleteEntity(id: ID!): Boolean!
      }

      input CreateEntityInput {
        type: String!
        name: String!
      }
    `,
        resolvers: {
            Query: {
                // Example: Paginated entities with caching
                entities: async (parent, args, context) => {
                    const { tenantId, loaders, cacheManager } = context;
                    // 1. Generate cache key
                    const cacheKey = (0, redis_1.hashGraphQLQuery)('entities', args);
                    // 2. Check cache
                    const cached = await cacheManager.getGraphQLQuery(cacheKey, tenantId);
                    if (cached) {
                        console.log('Cache hit for entities query');
                        return cached;
                    }
                    // 3. Validate pagination input
                    const { limit, isForward, cursor } = (0, pagination_1.validatePaginationInput)(args);
                    // 4. Query database (automatically uses DataLoader for batching)
                    const query = `
            SELECT * FROM entities
            WHERE tenant_id = $1
            ${cursor ? 'AND id > $2' : ''}
            ORDER BY id ASC
            LIMIT $${cursor ? '3' : '2'}
          `;
                    const params = cursor
                        ? [tenantId, cursor, limit + 1]
                        : [tenantId, limit + 1];
                    const result = await context.postgresPool.query(query, params);
                    // 5. Get total count (cached separately)
                    const countResult = await context.postgresPool.query('SELECT COUNT(*) FROM entities WHERE tenant_id = $1', [tenantId]);
                    const totalCount = parseInt(countResult.rows[0].count);
                    // 6. Create connection response
                    const connection = (0, pagination_1.createConnection)(result.rows, args, totalCount);
                    // 7. Cache the result
                    await cacheManager.cacheGraphQLQuery(cacheKey, connection, tenantId);
                    return connection;
                },
                // Example: Single entity with DataLoader
                entity: async (parent, args, context) => {
                    const { loaders } = context;
                    // DataLoader automatically batches multiple entity.load() calls
                    // within the same tick into a single database query
                    return loaders.entityLoader.load(args.id);
                },
            },
            Entity: {
                // Example: Resolving relationships with DataLoader (prevents N+1)
                relationships: async (parent, args, context) => {
                    const { loaders } = context;
                    // This batches all relationship queries for all entities
                    // resolved in this request into a single database query
                    return loaders.entityRelationshipsLoader.load(parent.id);
                },
            },
            Mutation: {
                // Example: Mutation with cache invalidation
                createEntity: async (parent, args, context) => {
                    const { tenantId, postgresPool, cacheManager } = context;
                    // 1. Create entity
                    const result = await postgresPool.query('INSERT INTO entities (type, name, tenant_id) VALUES ($1, $2, $3) RETURNING *', [args.input.type, args.input.name, tenantId]);
                    const entity = result.rows[0];
                    // 2. Invalidate all entity-related caches
                    await cacheManager.invalidateOnMutation('entity', entity.id, tenantId);
                    // 3. Clear DataLoader cache for this request
                    context.loaders.entityLoader.clear(entity.id);
                    return entity;
                },
                deleteEntity: async (parent, args, context) => {
                    const { tenantId, postgresPool, cacheManager } = context;
                    // 1. Delete entity
                    await postgresPool.query('DELETE FROM entities WHERE id = $1 AND tenant_id = $2', [args.id, tenantId]);
                    // 2. Invalidate caches
                    await cacheManager.invalidateOnMutation('entity', args.id, tenantId);
                    return true;
                },
            },
        },
        // 4. Create context with all optimization features
        context: async ({ req }) => {
            // Extract tenant from request (adjust based on your auth)
            const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
            // Create fresh DataLoaders for this request
            const loaders = (0, dataloader_1.createDataLoaders)(postgresPool, neo4jDriver, tenantId);
            return {
                tenantId,
                loaders,
                neo4jDriver,
                postgresPool,
                cacheManager,
                queryTracker: req.queryTracker,
                cacheMonitor: req.cacheMonitor,
            };
        },
        // 5. Enable plugins for performance monitoring
        plugins: [
            {
                requestDidStart: async (requestContext) => {
                    const start = Date.now();
                    return {
                        willSendResponse: async () => {
                            const duration = Date.now() - start;
                            // Log slow queries
                            if (duration > 1000) {
                                console.warn({
                                    msg: 'Slow GraphQL query',
                                    duration,
                                    operationName: requestContext.operationName,
                                    query: requestContext.request.query?.substring(0, 200),
                                });
                            }
                        },
                    };
                },
            },
        ],
    });
    return { app, server };
}
/**
 * ============================================================================
 * EXAMPLE 4: Query Caching with Neo4j
 * ============================================================================
 *
 * This example shows how to use the Neo4j query cache effectively
 */
async function queryWithCaching(neo4jDriver, tenantId) {
    // 1. Create query cache
    const queryCache = new neo4j_1.Neo4jQueryCache(1000, 300000); // 1000 items, 5min TTL
    // 2. Define query
    const cypher = `
    MATCH (e:Entity {tenantId: $tenantId, type: $type})
    WHERE e.confidence > 0.8
    RETURN e
    LIMIT 100
  `;
    const params = {
        tenantId,
        type: 'PERSON',
    };
    // 3. Check cache first
    const cached = queryCache.get(cypher, params);
    if (cached) {
        console.log('Cache hit!');
        return cached;
    }
    // 4. Execute query
    const session = neo4jDriver.session();
    try {
        const result = await session.run(cypher, params);
        // 5. Cache result
        queryCache.set(cypher, params, result);
        console.log('Query executed and cached');
        return result;
    }
    finally {
        await session.close();
    }
}
/**
 * ============================================================================
 * EXAMPLE 5: Monitoring and Health Checks
 * ============================================================================
 *
 * This example shows how to set up health checks and monitoring
 */
function setupMonitoringEndpoints(app) {
    const express = require('express');
    // 1. Database health check endpoint
    app.get('/health/database', async (req, res) => {
        try {
            const report = database_monitoring_1.databaseHealthMonitor.getHealthReport();
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                postgres: report.postgres,
                cache: report.cache,
            });
        }
        catch (error) {
            res.status(500).json({
                status: 'unhealthy',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    });
    // 2. Slow queries endpoint
    app.get('/health/slow-queries', async (req, res) => {
        const tracker = database_monitoring_1.databaseHealthMonitor.getQueryTracker();
        const slowQueries = tracker.getSlowQueryReport(20);
        res.json({
            queries: slowQueries,
            threshold: 100, // ms
        });
    });
    // 3. Cache statistics endpoint
    app.get('/health/cache-stats', async (req, res) => {
        const cacheMonitor = database_monitoring_1.databaseHealthMonitor.getCacheMonitor();
        const stats = cacheMonitor.getStats();
        res.json({
            overall: {
                hitRate: stats.overall?.hitRate || 0,
                hits: stats.overall?.hits || 0,
                misses: stats.overall?.misses || 0,
            },
            byType: stats,
        });
    });
    // 4. Prometheus metrics endpoint
    app.get('/metrics', async (req, res) => {
        const { register } = require('prom-client');
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    });
    console.log('Monitoring endpoints configured:');
    console.log('  - GET /health/database');
    console.log('  - GET /health/slow-queries');
    console.log('  - GET /health/cache-stats');
    console.log('  - GET /metrics');
}
/**
 * ============================================================================
 * EXAMPLE 6: Complete Application Bootstrap
 * ============================================================================
 *
 * This example ties everything together
 */
async function bootstrapApplication() {
    try {
        console.log('Starting application with database optimizations...\n');
        // 1. Set up databases
        const { neo4jDriver, postgresPool, cacheManager } = await setupOptimizedDatabases();
        console.log('');
        // 2. Apply optimizations (run once during migration)
        // Uncomment this during initial setup or migration
        // await applyDatabaseOptimizations(neo4jDriver, postgresPool);
        // console.log('');
        // 3. Set up GraphQL server
        const { app, server } = setupGraphQLServer(neo4jDriver, postgresPool, cacheManager);
        // 4. Set up monitoring
        setupMonitoringEndpoints(app);
        console.log('');
        // 5. Start server
        await server.start();
        server.applyMiddleware({ app });
        const PORT = process.env.PORT || 4000;
        app.listen(PORT, () => {
            console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
            console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
            console.log(`🏥 Health check at http://localhost:${PORT}/health/database`);
        });
        // 6. Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received, shutting down gracefully...');
            await server.stop();
            await neo4jDriver.close();
            await postgresPool.end();
            database_monitoring_1.databaseHealthMonitor.stop();
            console.log('Shutdown complete');
            process.exit(0);
        });
        return { app, server, neo4jDriver, postgresPool, cacheManager };
    }
    catch (error) {
        console.error('Failed to bootstrap application:', error);
        process.exit(1);
    }
}
/**
 * ============================================================================
 * EXAMPLE 7: Advanced Query Patterns
 * ============================================================================
 */
async function advancedQueryPatterns(neo4jDriver, postgresPool, cacheManager) {
    // Pattern 1: Complex graph traversal with caching
    async function getEntityNetwork(entityId, tenantId, depth = 2) {
        const cacheKey = `network:${entityId}:${depth}`;
        const cached = await cacheManager.get(redis_1.CACHE_PREFIX.GRAPH_METRICS, cacheKey, tenantId);
        if (cached)
            return cached;
        const session = neo4jDriver.session();
        try {
            const cypher = `
        MATCH path = (e:Entity {id: $entityId, tenantId: $tenantId})-[:RELATED_TO*1..${depth}]-(connected)
        RETURN e, connected, relationships(path) as rels
      `;
            const result = await session.run(cypher, { entityId, tenantId });
            // Transform and cache
            const network = transformNetworkResult(result);
            await cacheManager.set(redis_1.CACHE_PREFIX.GRAPH_METRICS, cacheKey, network, tenantId, redis_1.CACHE_TTL.GRAPH_METRICS);
            return network;
        }
        finally {
            await session.close();
        }
    }
    // Pattern 2: Aggregation with read replica
    async function getEntityStatsByType(tenantId) {
        const cacheKey = 'stats:by-type';
        const cached = await cacheManager.get(redis_1.CACHE_PREFIX.METRICS, cacheKey, tenantId);
        if (cached)
            return cached;
        // Use read pool for analytics query
        const query = `
      SELECT
        type,
        COUNT(*) as count,
        AVG(confidence) as avg_confidence,
        MAX(created_at) as latest_created
      FROM entities
      WHERE tenant_id = $1
      GROUP BY type
      ORDER BY count DESC
    `;
        const result = await postgresPool.query(query, [tenantId]);
        await cacheManager.set(redis_1.CACHE_PREFIX.METRICS, cacheKey, result.rows, tenantId, redis_1.CACHE_TTL.GRAPH_METRICS);
        return result.rows;
    }
    // Pattern 3: Transaction with retry logic
    async function createEntityWithRelationships(entity, relationships, tenantId) {
        const client = await postgresPool.connect();
        try {
            await client.query('BEGIN');
            // Insert entity
            const entityResult = await client.query('INSERT INTO entities (type, name, tenant_id) VALUES ($1, $2, $3) RETURNING *', [entity.type, entity.name, tenantId]);
            const createdEntity = entityResult.rows[0];
            // Insert relationships
            for (const rel of relationships) {
                await client.query('INSERT INTO relationships (source_id, target_id, type, tenant_id) VALUES ($1, $2, $3, $4)', [createdEntity.id, rel.targetId, rel.type, tenantId]);
            }
            await client.query('COMMIT');
            // Invalidate caches
            await cacheManager.invalidateOnMutation('entity', createdEntity.id, tenantId);
            return createdEntity;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    return {
        getEntityNetwork,
        getEntityStatsByType,
        createEntityWithRelationships,
    };
}
// Helper function for example
function transformNetworkResult(result) {
    // Transform Neo4j result to application format
    return {
        nodes: result.records.map((r) => r.get('e')),
        edges: result.records.flatMap((r) => r.get('rels')),
    };
}
/**
 * ============================================================================
 * Usage
 * ============================================================================
 *
 * To use these examples in your application:
 *
 * 1. Basic setup:
 *    ```
 *    import { bootstrapApplication } from './docs/examples/database-optimization-integration';
 *    await bootstrapApplication();
 *    ```
 *
 * 2. Run migrations:
 *    ```
 *    const { neo4jDriver, postgresPool } = await setupOptimizedDatabases();
 *    await applyDatabaseOptimizations(neo4jDriver, postgresPool);
 *    ```
 *
 * 3. Custom setup:
 *    ```
 *    const { neo4jDriver, postgresPool, cacheManager } = await setupOptimizedDatabases();
 *    // Use in your own application setup
 *    ```
 */
exports.default = {
    setupOptimizedDatabases,
    applyDatabaseOptimizations,
    setupGraphQLServer,
    queryWithCaching,
    setupMonitoringEndpoints,
    bootstrapApplication,
    advancedQueryPatterns,
};
