"use strict";
/**
 * IntelGraph Neo4j Database Driver
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.neo4jDriver = exports.neo4jConnection = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const logger_js_1 = require("../utils/logger.js");
class Neo4jConnection {
    driver = null;
    isConnected = false;
    async connect() {
        if (this.isConnected && this.driver) {
            return;
        }
        const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
        const username = process.env.NEO4J_USERNAME || 'neo4j';
        const password = process.env.NEO4J_PASSWORD || 'password';
        try {
            this.driver = neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(username, password), {
                maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
                maxConnectionPoolSize: 50,
                connectionAcquisitionTimeout: 60000, // 60 seconds
                disableLosslessIntegers: true,
            });
            // Verify connectivity
            await this.driver.verifyConnectivity();
            this.isConnected = true;
            logger_js_1.logger.info({
                message: 'Neo4j connection established',
                uri: uri.replace(/\/\/.*@/, '//***@'), // Hide credentials in logs
            });
            // Create constraints and indexes
            await this.createConstraintsAndIndexes();
        }
        catch (error) {
            logger_js_1.logger.error({
                message: 'Failed to connect to Neo4j',
                error: error instanceof Error ? error.message : String(error),
                uri: uri.replace(/\/\/.*@/, '//***@'),
            });
            throw error;
        }
    }
    async createConstraintsAndIndexes() {
        const session = this.getSession();
        try {
            // Entity constraints and indexes
            await session.run(`
        CREATE CONSTRAINT entity_id_unique IF NOT EXISTS 
        FOR (e:Entity) REQUIRE e.id IS UNIQUE
      `);
            await session.run(`
        CREATE CONSTRAINT entity_tenant_isolation IF NOT EXISTS 
        FOR (e:Entity) REQUIRE (e.id, e.tenantId) IS UNIQUE
      `);
            // Relationship constraints
            await session.run(`
        CREATE CONSTRAINT relationship_id_unique IF NOT EXISTS 
        FOR ()-[r:RELATES_TO]-() REQUIRE r.id IS UNIQUE
      `);
            // Investigation constraints
            await session.run(`
        CREATE CONSTRAINT investigation_id_unique IF NOT EXISTS 
        FOR (i:Investigation) REQUIRE i.id IS UNIQUE
      `);
            // Performance indexes
            await session.run(`
        CREATE INDEX entity_type_idx IF NOT EXISTS 
        FOR (e:Entity) ON (e.type)
      `);
            await session.run(`
        CREATE INDEX entity_tenant_idx IF NOT EXISTS 
        FOR (e:Entity) ON (e.tenantId)
      `);
            await session.run(`
        CREATE INDEX entity_created_at_idx IF NOT EXISTS 
        FOR (e:Entity) ON (e.createdAt)
      `);
            await session.run(`
        CREATE INDEX relationship_type_idx IF NOT EXISTS 
        FOR ()-[r:RELATES_TO]-() ON (r.type)
      `);
            await session.run(`
        CREATE INDEX relationship_confidence_idx IF NOT EXISTS 
        FOR ()-[r:RELATES_TO]-() ON (r.confidence)
      `);
            // Full-text search indexes
            await session.run(`
        CREATE FULLTEXT INDEX entity_search_idx IF NOT EXISTS 
        FOR (e:Entity) ON EACH [e.name, e.description]
      `);
            await session.run(`
        CREATE FULLTEXT INDEX investigation_search_idx IF NOT EXISTS 
        FOR (i:Investigation) ON EACH [i.name, i.description]
      `);
            logger_js_1.logger.info('Neo4j constraints and indexes created successfully');
        }
        catch (error) {
            logger_js_1.logger.error({
                message: 'Failed to create Neo4j constraints and indexes',
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        finally {
            await session.close();
        }
    }
    getSession(database) {
        if (!this.driver) {
            throw new Error('Neo4j driver not initialized');
        }
        return this.driver.session({ database });
    }
    async executeQuery(query, parameters = {}, database) {
        const session = this.getSession(database);
        try {
            const result = await session.run(query, parameters);
            return result.records.map((record) => record.toObject());
        }
        catch (error) {
            logger_js_1.logger.error({
                message: 'Neo4j query failed',
                query,
                parameters,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        finally {
            await session.close();
        }
    }
    async executeTransaction(queries, database) {
        const session = this.getSession(database);
        try {
            const result = await session.executeWrite(async (tx) => {
                const results = [];
                for (const { query, parameters = {} } of queries) {
                    const queryResult = await tx.run(query, parameters);
                    results.push(queryResult.records.map((record) => record.toObject()));
                }
                return results;
            });
            return result.flat();
        }
        catch (error) {
            logger_js_1.logger.error({
                message: 'Neo4j transaction failed',
                queries: queries.map((q) => q.query),
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        finally {
            await session.close();
        }
    }
    // Specialized methods for common graph operations
    async findShortestPath(sourceId, targetId, tenantId, maxDepth = 6, relationshipTypes) {
        const relationshipFilter = relationshipTypes
            ? `:${relationshipTypes.join('|:')}`
            : '';
        const query = `
      MATCH (source:Entity {id: $sourceId, tenantId: $tenantId}),
            (target:Entity {id: $targetId, tenantId: $tenantId})
      MATCH path = shortestPath((source)-[${relationshipFilter}*1..${maxDepth}]-(target))
      RETURN path
    `;
        return this.executeQuery(query, { sourceId, targetId, tenantId });
    }
    async findNeighbors(entityId, tenantId, depth = 1, direction = 'both') {
        const directionSymbol = {
            incoming: '<-',
            outgoing: '->',
            both: '-',
        }[direction];
        const query = `
      MATCH (entity:Entity {id: $entityId, tenantId: $tenantId})
      MATCH (entity)${directionSymbol}[r*1..${depth}]${directionSymbol}(neighbor:Entity {tenantId: $tenantId})
      RETURN DISTINCT neighbor, r
      ORDER BY neighbor.name
    `;
        return this.executeQuery(query, { entityId, tenantId });
    }
    async calculateCentrality(entityIds, tenantId, algorithm = 'pagerank') {
        // Note: This requires APOC procedures for advanced graph algorithms
        const query = `
      MATCH (e:Entity {tenantId: $tenantId})
      WHERE e.id IN $entityIds
      CALL apoc.algo.${algorithm}Centrality(
        'MATCH (n:Entity {tenantId: "${tenantId}"}) WHERE n.id IN $entityIds RETURN id(n) as id',
        'MATCH (n:Entity {tenantId: "${tenantId}"})-[r:RELATES_TO]-(m:Entity {tenantId: "${tenantId}"}) WHERE n.id IN $entityIds AND m.id IN $entityIds RETURN id(n) as source, id(m) as target',
        'both'
      )
      YIELD nodeId, score
      MATCH (n) WHERE id(n) = nodeId
      RETURN n.id as entityId, n.name as entityName, score
      ORDER BY score DESC
    `;
        return this.executeQuery(query, { entityIds, tenantId });
    }
    async close() {
        if (this.driver) {
            await this.driver.close();
            this.driver = null;
            this.isConnected = false;
            logger_js_1.logger.info('Neo4j connection closed');
        }
    }
    // Health check
    async healthCheck() {
        try {
            if (!this.driver) {
                return { status: 'disconnected' };
            }
            const session = this.getSession();
            const result = await session.run('RETURN 1 as health');
            await session.close();
            return {
                status: 'healthy',
                details: {
                    connected: this.isConnected,
                    serverInfo: await this.driver.getServerInfo(),
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
}
// Export singleton instance
exports.neo4jConnection = new Neo4jConnection();
exports.neo4jDriver = exports.neo4jConnection;
// Initialize connection on module load
exports.neo4jConnection.connect().catch((error) => {
    logger_js_1.logger.error({
        message: 'Failed to initialize Neo4j connection',
        error: error instanceof Error ? error.message : String(error),
    });
});
