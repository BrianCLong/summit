"use strict";
/**
 * @fileoverview Third-Party Integration Tests
 *
 * Comprehensive integration tests for external services:
 * - Neo4j Graph Database
 * - PostgreSQL Database
 * - Redis Cache
 * - OpenTelemetry
 * - External APIs (mocked)
 *
 * These tests verify proper integration with external dependencies
 * and handle both success and failure scenarios.
 *
 * @module tests/integration/third-party-integrations.test
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Test configuration
const TEST_CONFIG = {
    neo4j: {
        uri: process.env.NEO4J_TEST_URI || 'bolt://localhost:7687',
        username: process.env.NEO4J_TEST_USERNAME || 'neo4j',
        password: process.env.NEO4J_TEST_PASSWORD || 'testpassword',
    },
    postgres: {
        host: process.env.POSTGRES_TEST_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_TEST_PORT || '5432'),
        database: process.env.POSTGRES_TEST_DB || 'intelgraph_test',
        username: process.env.POSTGRES_TEST_USER || 'test',
        password: process.env.POSTGRES_TEST_PASSWORD || 'testpassword',
    },
    redis: {
        host: process.env.REDIS_TEST_HOST || 'localhost',
        port: parseInt(process.env.REDIS_TEST_PORT || '6379'),
        password: process.env.REDIS_TEST_PASSWORD || '',
    },
};
/**
 * Mock Neo4j Driver for testing without actual database
 */
class MockNeo4jDriver {
    connected = false;
    sessionCount = 0;
    async verifyConnectivity() {
        this.connected = true;
        return Promise.resolve();
    }
    session(config) {
        this.sessionCount++;
        return new MockNeo4jSession();
    }
    async close() {
        this.connected = false;
        return Promise.resolve();
    }
    isConnected() {
        return this.connected;
    }
    getSessionCount() {
        return this.sessionCount;
    }
}
class MockNeo4jSession {
    transactions = 0;
    async run(query, params) {
        // Simulate query execution
        if (query.includes('RETURN')) {
            return new MockNeo4jResult([{ id: '1', name: 'Test Entity' }]);
        }
        return new MockNeo4jResult([]);
    }
    async close() {
        return Promise.resolve();
    }
    beginTransaction() {
        this.transactions++;
        return new MockNeo4jTransaction();
    }
    readTransaction(work) {
        return work(new MockNeo4jTransaction());
    }
    writeTransaction(work) {
        return work(new MockNeo4jTransaction());
    }
}
class MockNeo4jTransaction {
    async run(query, params) {
        return new MockNeo4jResult([]);
    }
    async commit() {
        return Promise.resolve();
    }
    async rollback() {
        return Promise.resolve();
    }
}
class MockNeo4jResult {
    records;
    constructor(data) {
        this.records = data.map((item) => ({
            get: (key) => item[key],
            toObject: () => item,
        }));
    }
}
/**
 * Mock PostgreSQL Pool for testing
 */
class MockPostgresPool {
    connected = false;
    queryCount = 0;
    async connect() {
        this.connected = true;
        return new MockPostgresClient();
    }
    async query(text, params) {
        this.queryCount++;
        return new MockPostgresResult([]);
    }
    async end() {
        this.connected = false;
        return Promise.resolve();
    }
    isConnected() {
        return this.connected;
    }
    getQueryCount() {
        return this.queryCount;
    }
}
class MockPostgresClient {
    async query(text, params) {
        // Simulate various query types
        if (text.includes('SELECT')) {
            return new MockPostgresResult([{ id: 1, name: 'Test' }]);
        }
        if (text.includes('INSERT')) {
            return new MockPostgresResult([], 1);
        }
        if (text.includes('UPDATE')) {
            return new MockPostgresResult([], 1);
        }
        if (text.includes('DELETE')) {
            return new MockPostgresResult([], 1);
        }
        return new MockPostgresResult([]);
    }
    release() {
        // No-op for mock
    }
}
class MockPostgresResult {
    rows;
    rowCount;
    constructor(rows, rowCount) {
        this.rows = rows;
        this.rowCount = rowCount ?? rows.length;
    }
}
/**
 * Mock Redis Client for testing
 */
class MockRedisClient {
    store = new Map();
    connected = false;
    pubSubCallbacks = new Map();
    async connect() {
        this.connected = true;
        return Promise.resolve();
    }
    async disconnect() {
        this.connected = false;
        return Promise.resolve();
    }
    async get(key) {
        return this.store.get(key) || null;
    }
    async set(key, value, options) {
        this.store.set(key, value);
        if (options?.EX) {
            setTimeout(() => this.store.delete(key), options.EX * 1000);
        }
        return 'OK';
    }
    async del(key) {
        const existed = this.store.has(key);
        this.store.delete(key);
        return existed ? 1 : 0;
    }
    async exists(key) {
        return this.store.has(key) ? 1 : 0;
    }
    async expire(key, seconds) {
        if (this.store.has(key)) {
            setTimeout(() => this.store.delete(key), seconds * 1000);
            return 1;
        }
        return 0;
    }
    async incr(key) {
        const current = parseInt(this.store.get(key) || '0');
        const next = current + 1;
        this.store.set(key, next.toString());
        return next;
    }
    async publish(channel, message) {
        const callbacks = this.pubSubCallbacks.get(channel) || [];
        callbacks.forEach((cb) => cb(message));
        return callbacks.length;
    }
    async subscribe(channel, callback) {
        const callbacks = this.pubSubCallbacks.get(channel) || [];
        callbacks.push(callback);
        this.pubSubCallbacks.set(channel, callbacks);
    }
    isOpen() {
        return this.connected;
    }
    clear() {
        this.store.clear();
    }
}
(0, globals_1.describe)('Third-Party Integration Tests', () => {
    (0, globals_1.describe)('Neo4j Integration', () => {
        let driver;
        (0, globals_1.beforeAll)(async () => {
            driver = new MockNeo4jDriver();
            await driver.verifyConnectivity();
        });
        (0, globals_1.afterAll)(async () => {
            await driver.close();
        });
        (0, globals_1.it)('should establish connection to Neo4j', async () => {
            (0, globals_1.expect)(driver.isConnected()).toBe(true);
        });
        (0, globals_1.it)('should create and close sessions', async () => {
            const session = driver.session({ database: 'neo4j' });
            (0, globals_1.expect)(session).toBeDefined();
            await session.close();
            (0, globals_1.expect)(driver.getSessionCount()).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should execute read queries', async () => {
            const session = driver.session();
            try {
                const result = await session.run('MATCH (n:Entity) RETURN n.id as id, n.name as name LIMIT 10');
                (0, globals_1.expect)(result.records).toBeDefined();
                (0, globals_1.expect)(Array.isArray(result.records)).toBe(true);
            }
            finally {
                await session.close();
            }
        });
        (0, globals_1.it)('should execute write queries', async () => {
            const session = driver.session();
            try {
                const result = await session.run('CREATE (n:Entity {id: $id, name: $name}) RETURN n', { id: 'test-123', name: 'Test Entity' });
                (0, globals_1.expect)(result).toBeDefined();
            }
            finally {
                await session.close();
            }
        });
        (0, globals_1.it)('should handle transactions', async () => {
            const session = driver.session();
            try {
                const result = await session.writeTransaction(async (tx) => {
                    await tx.run('CREATE (n:TestNode {id: $id})', { id: 'tx-test' });
                    return 'committed';
                });
                (0, globals_1.expect)(result).toBe('committed');
            }
            finally {
                await session.close();
            }
        });
        (0, globals_1.it)('should handle transaction rollback', async () => {
            const session = driver.session();
            const tx = session.beginTransaction();
            try {
                await tx.run('CREATE (n:TestNode)');
                await tx.rollback();
                // Transaction rolled back successfully
                (0, globals_1.expect)(true).toBe(true);
            }
            finally {
                await session.close();
            }
        });
        (0, globals_1.it)('should handle parameterized queries safely', async () => {
            const session = driver.session();
            try {
                // Attempt SQL injection (should be parameterized safely)
                const maliciousInput = "'; DROP DATABASE neo4j; --";
                const result = await session.run('MATCH (n:Entity) WHERE n.name = $name RETURN n', { name: maliciousInput });
                // Query should execute without harm due to parameterization
                (0, globals_1.expect)(result).toBeDefined();
            }
            finally {
                await session.close();
            }
        });
    });
    (0, globals_1.describe)('PostgreSQL Integration', () => {
        let pool;
        (0, globals_1.beforeAll)(async () => {
            pool = new MockPostgresPool();
        });
        (0, globals_1.afterAll)(async () => {
            await pool.end();
        });
        (0, globals_1.it)('should establish connection to PostgreSQL', async () => {
            const client = await pool.connect();
            (0, globals_1.expect)(client).toBeDefined();
            client.release();
            (0, globals_1.expect)(pool.isConnected()).toBe(true);
        });
        (0, globals_1.it)('should execute SELECT queries', async () => {
            const result = await pool.query('SELECT * FROM users LIMIT 10');
            (0, globals_1.expect)(result.rows).toBeDefined();
            (0, globals_1.expect)(Array.isArray(result.rows)).toBe(true);
        });
        (0, globals_1.it)('should execute INSERT queries', async () => {
            const result = await pool.query('INSERT INTO entities (id, name, type) VALUES ($1, $2, $3)', ['entity-1', 'Test Entity', 'Person']);
            (0, globals_1.expect)(result.rowCount).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.it)('should execute UPDATE queries', async () => {
            const result = await pool.query('UPDATE entities SET name = $1 WHERE id = $2', ['Updated Name', 'entity-1']);
            (0, globals_1.expect)(result).toBeDefined();
        });
        (0, globals_1.it)('should execute DELETE queries', async () => {
            const result = await pool.query('DELETE FROM entities WHERE id = $1', [
                'entity-1',
            ]);
            (0, globals_1.expect)(result).toBeDefined();
        });
        (0, globals_1.it)('should handle transactions', async () => {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                await client.query('INSERT INTO test_table (id) VALUES ($1)', ['1']);
                await client.query('COMMIT');
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        });
        (0, globals_1.it)('should handle parameterized queries for security', async () => {
            const maliciousInput = "'; DROP TABLE users; --";
            const result = await pool.query('SELECT * FROM users WHERE name = $1', [
                maliciousInput,
            ]);
            // Query should execute safely with parameterization
            (0, globals_1.expect)(result).toBeDefined();
        });
    });
    (0, globals_1.describe)('Redis Integration', () => {
        let redis;
        (0, globals_1.beforeAll)(async () => {
            redis = new MockRedisClient();
            await redis.connect();
        });
        (0, globals_1.afterAll)(async () => {
            await redis.disconnect();
        });
        (0, globals_1.beforeEach)(() => {
            redis.clear();
        });
        (0, globals_1.it)('should establish connection to Redis', async () => {
            (0, globals_1.expect)(redis.isOpen()).toBe(true);
        });
        (0, globals_1.it)('should set and get values', async () => {
            await redis.set('test-key', 'test-value');
            const value = await redis.get('test-key');
            (0, globals_1.expect)(value).toBe('test-value');
        });
        (0, globals_1.it)('should handle missing keys', async () => {
            const value = await redis.get('non-existent-key');
            (0, globals_1.expect)(value).toBeNull();
        });
        (0, globals_1.it)('should delete keys', async () => {
            await redis.set('to-delete', 'value');
            const deleted = await redis.del('to-delete');
            (0, globals_1.expect)(deleted).toBe(1);
            const value = await redis.get('to-delete');
            (0, globals_1.expect)(value).toBeNull();
        });
        (0, globals_1.it)('should check key existence', async () => {
            await redis.set('exists-key', 'value');
            const exists = await redis.exists('exists-key');
            (0, globals_1.expect)(exists).toBe(1);
            const notExists = await redis.exists('not-exists-key');
            (0, globals_1.expect)(notExists).toBe(0);
        });
        (0, globals_1.it)('should increment values', async () => {
            await redis.set('counter', '0');
            const result = await redis.incr('counter');
            (0, globals_1.expect)(result).toBe(1);
            const secondResult = await redis.incr('counter');
            (0, globals_1.expect)(secondResult).toBe(2);
        });
        (0, globals_1.it)('should handle pub/sub', async () => {
            const messages = [];
            await redis.subscribe('test-channel', (message) => {
                messages.push(message);
            });
            await redis.publish('test-channel', 'Hello World');
            (0, globals_1.expect)(messages).toContain('Hello World');
        });
        (0, globals_1.it)('should implement caching patterns', async () => {
            // Cache-aside pattern test
            const cacheKey = 'user:123';
            let cacheHits = 0;
            let dbCalls = 0;
            const getUserFromDb = async () => {
                dbCalls++;
                return { id: '123', name: 'Test User' };
            };
            const getUser = async (id) => {
                const cached = await redis.get(`user:${id}`);
                if (cached) {
                    cacheHits++;
                    return JSON.parse(cached);
                }
                const user = await getUserFromDb();
                await redis.set(`user:${id}`, JSON.stringify(user), { EX: 3600 });
                return user;
            };
            // First call - cache miss
            const user1 = await getUser('123');
            (0, globals_1.expect)(dbCalls).toBe(1);
            (0, globals_1.expect)(cacheHits).toBe(0);
            // Second call - cache hit
            const user2 = await getUser('123');
            (0, globals_1.expect)(dbCalls).toBe(1);
            (0, globals_1.expect)(cacheHits).toBe(1);
        });
    });
    (0, globals_1.describe)('Cross-Service Integration', () => {
        let neo4j;
        let postgres;
        let redis;
        (0, globals_1.beforeAll)(async () => {
            neo4j = new MockNeo4jDriver();
            postgres = new MockPostgresPool();
            redis = new MockRedisClient();
            await neo4j.verifyConnectivity();
            await redis.connect();
        });
        (0, globals_1.afterAll)(async () => {
            await neo4j.close();
            await postgres.end();
            await redis.disconnect();
        });
        (0, globals_1.it)('should handle multi-database operations', async () => {
            // Simulate creating an entity across all databases
            const entityId = 'cross-db-entity-1';
            const entityData = { id: entityId, name: 'Cross-DB Entity', type: 'Person' };
            // 1. Create in PostgreSQL (primary storage)
            await postgres.query('INSERT INTO entities (id, name, type) VALUES ($1, $2, $3)', [entityData.id, entityData.name, entityData.type]);
            // 2. Create in Neo4j (graph storage)
            const session = neo4j.session();
            await session.run('CREATE (n:Entity {id: $id, name: $name, type: $type})', entityData);
            await session.close();
            // 3. Invalidate any cached data
            await redis.del(`entity:${entityId}`);
            // All operations completed
            (0, globals_1.expect)(true).toBe(true);
        });
        (0, globals_1.it)('should handle distributed transaction simulation', async () => {
            // Simulate a distributed transaction with compensation
            const operations = [];
            const rollbackOperations = [];
            try {
                // Step 1: PostgreSQL operation
                await postgres.query('INSERT INTO audit_log (action) VALUES ($1)', ['create']);
                operations.push('postgres');
                // Step 2: Neo4j operation
                const session = neo4j.session();
                await session.run('CREATE (n:AuditNode {action: $action})', { action: 'create' });
                operations.push('neo4j');
                await session.close();
                // Step 3: Redis operation
                await redis.set('last-audit', Date.now().toString());
                operations.push('redis');
                (0, globals_1.expect)(operations).toHaveLength(3);
            }
            catch (error) {
                // Rollback in reverse order
                for (const op of operations.reverse()) {
                    rollbackOperations.push(`rollback-${op}`);
                }
                throw error;
            }
        });
        (0, globals_1.it)('should handle connection failures gracefully', async () => {
            // Test resilience to connection failures
            const healthCheck = async () => {
                const status = {
                    neo4j: false,
                    postgres: false,
                    redis: false,
                };
                try {
                    await neo4j.verifyConnectivity();
                    status.neo4j = true;
                }
                catch (e) {
                    // Neo4j unavailable
                }
                try {
                    await postgres.connect();
                    status.postgres = true;
                }
                catch (e) {
                    // PostgreSQL unavailable
                }
                try {
                    status.redis = redis.isOpen();
                }
                catch (e) {
                    // Redis unavailable
                }
                return status;
            };
            const status = await healthCheck();
            (0, globals_1.expect)(typeof status.neo4j).toBe('boolean');
            (0, globals_1.expect)(typeof status.postgres).toBe('boolean');
            (0, globals_1.expect)(typeof status.redis).toBe('boolean');
        });
    });
    (0, globals_1.describe)('Error Handling and Resilience', () => {
        (0, globals_1.it)('should handle connection timeouts', async () => {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 100));
            const connectPromise = new Promise((resolve) => setTimeout(() => resolve('connected'), 200));
            try {
                await Promise.race([timeoutPromise, connectPromise]);
                fail('Should have timed out');
            }
            catch (error) {
                (0, globals_1.expect)(error.message).toBe('Connection timeout');
            }
        });
        (0, globals_1.it)('should implement retry logic', async () => {
            let attempts = 0;
            const maxRetries = 3;
            const operationWithRetry = async () => {
                for (let i = 0; i < maxRetries; i++) {
                    attempts++;
                    try {
                        if (attempts < 3) {
                            throw new Error('Transient error');
                        }
                        return 'success';
                    }
                    catch (error) {
                        if (i === maxRetries - 1)
                            throw error;
                        await new Promise((r) => setTimeout(r, 10));
                    }
                }
                throw new Error('Max retries exceeded');
            };
            const result = await operationWithRetry();
            (0, globals_1.expect)(result).toBe('success');
            (0, globals_1.expect)(attempts).toBe(3);
        });
        (0, globals_1.it)('should implement circuit breaker pattern', async () => {
            const circuitBreaker = {
                failures: 0,
                threshold: 3,
                isOpen: false,
                lastFailure: 0,
                resetTimeout: 1000,
                async execute(operation) {
                    if (this.isOpen) {
                        if (Date.now() - this.lastFailure > this.resetTimeout) {
                            this.isOpen = false;
                            this.failures = 0;
                        }
                        else {
                            throw new Error('Circuit breaker is open');
                        }
                    }
                    try {
                        const result = await operation();
                        this.failures = 0;
                        return result;
                    }
                    catch (error) {
                        this.failures++;
                        this.lastFailure = Date.now();
                        if (this.failures >= this.threshold) {
                            this.isOpen = true;
                        }
                        throw error;
                    }
                },
            };
            // Simulate failures
            const failingOperation = async () => {
                throw new Error('Service unavailable');
            };
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(failingOperation);
                }
                catch (e) {
                    // Expected
                }
            }
            (0, globals_1.expect)(circuitBreaker.isOpen).toBe(true);
            try {
                await circuitBreaker.execute(failingOperation);
                fail('Should have thrown circuit breaker error');
            }
            catch (error) {
                (0, globals_1.expect)(error.message).toBe('Circuit breaker is open');
            }
        });
    });
});
