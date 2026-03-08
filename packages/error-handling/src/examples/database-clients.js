"use strict";
/**
 * Example: Database Clients with Resilience Patterns
 *
 * This demonstrates how to wrap existing database clients with
 * resilience patterns (retry, timeout, graceful degradation)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResilientRedisClient = exports.ResilientPostgresClient = exports.ResilientNeo4jClient = void 0;
const pino_1 = __importDefault(require("pino"));
const database_js_1 = require("../database.js");
const logger = (0, pino_1.default)({ name: 'DatabaseClients' });
/**
 * Example: Enhanced Neo4j Client
 */
class ResilientNeo4jClient {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    /**
     * Run query with resilience patterns
     */
    async query(cypher, parameters = {}, options) {
        return (0, database_js_1.executeNeo4jQuery)('query', async () => {
            const session = this.driver.session();
            try {
                const result = await session.run(cypher, parameters);
                return result.records.map((record) => record.toObject());
            }
            finally {
                await session.close();
            }
        }, options);
    }
    /**
     * Run write transaction with retry
     */
    async writeTransaction(fn, options) {
        return (0, database_js_1.executeNeo4jQuery)('writeTransaction', async () => {
            const session = this.driver.session();
            try {
                return await session.executeWrite(fn);
            }
            finally {
                await session.close();
            }
        }, options);
    }
    /**
     * Run read transaction with retry
     */
    async readTransaction(fn, options) {
        return (0, database_js_1.executeNeo4jQuery)('readTransaction', async () => {
            const session = this.driver.session();
            try {
                return await session.executeRead(fn);
            }
            finally {
                await session.close();
            }
        }, options);
    }
}
exports.ResilientNeo4jClient = ResilientNeo4jClient;
/**
 * Example: Enhanced PostgreSQL Client
 */
class ResilientPostgresClient {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Run query with resilience patterns
     */
    async query(text, params = [], options) {
        return (0, database_js_1.executePostgresQuery)('query', async () => {
            const result = await this.pool.query(text, params);
            return result.rows;
        }, options);
    }
    /**
     * Run transaction with automatic rollback
     */
    async transaction(fn) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.ResilientPostgresClient = ResilientPostgresClient;
/**
 * Example: Enhanced Redis Client with Graceful Degradation
 */
class ResilientRedisClient {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Get value with graceful degradation
     * Returns null if Redis is unavailable instead of throwing
     */
    async get(key) {
        return (0, database_js_1.executeRedisOperation)('get', async () => {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        }, null);
    }
    /**
     * Set value with graceful degradation
     * Logs error but doesn't throw if Redis is unavailable
     */
    async set(key, value, ttlSeconds) {
        return (0, database_js_1.executeRedisOperation)('set', async () => {
            const serialized = JSON.stringify(value);
            if (ttlSeconds) {
                await this.client.setex(key, ttlSeconds, serialized);
            }
            else {
                await this.client.set(key, serialized);
            }
            return true;
        }, false);
    }
    /**
     * Delete key with graceful degradation
     */
    async del(key) {
        return (0, database_js_1.executeRedisOperation)('del', async () => {
            const result = await this.client.del(key);
            return result > 0;
        }, false);
    }
    /**
     * Get multiple keys with graceful degradation
     */
    async mget(keys) {
        return (0, database_js_1.executeRedisOperation)('mget', async () => {
            const values = await this.client.mget(...keys);
            return values.map((v) => v ? JSON.parse(v) : null);
        }, keys.map(() => null));
    }
}
exports.ResilientRedisClient = ResilientRedisClient;
/**
 * Example usage in a service:
 *
 * import { ResilientNeo4jClient } from '@intelgraph/error-handling/examples/database-clients';
 *
 * const neo4jClient = new ResilientNeo4jClient(neo4jDriver);
 *
 * // Query with automatic retry and timeout
 * const entities = await neo4jClient.query(
 *   'MATCH (e:Entity {id: $id}) RETURN e',
 *   { id: entityId },
 *   { timeoutMs: 5000 }
 * );
 *
 * // Write transaction with retry
 * const result = await neo4jClient.writeTransaction(async (tx) => {
 *   await tx.run('CREATE (e:Entity {id: $id, name: $name})', { id, name });
 *   return { id, name };
 * });
 */
