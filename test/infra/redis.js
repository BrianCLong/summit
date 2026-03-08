"use strict";
/**
 * Test Infrastructure: Redis Test Fixtures
 *
 * Problem: Tests that rely on shared Redis state interfere with each other.
 *
 * Solution: Use isolated Redis database index per test, with automatic cleanup.
 *
 * Usage:
 *   import { createTestRedis, cleanupTestRedis } from '../../test/infra/redis';
 *
 *   let redis: TestRedis;
 *
 *   beforeEach(async () => {
 *     redis = await createTestRedis();
 *   });
 *
 *   afterEach(async () => {
 *     await cleanupTestRedis(redis);
 *   });
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestRedis = createTestRedis;
exports.cleanupTestRedis = cleanupTestRedis;
exports.setKey = setKey;
exports.getKey = getKey;
exports.deleteKey = deleteKey;
exports.getKeys = getKeys;
exports.flushTestRedis = flushTestRedis;
exports.countKeys = countKeys;
const redis_1 = require("redis");
// Track allocated database indices
const allocatedDbs = new Set();
const MAX_DB_INDEX = 15; // Redis supports 0-15 by default
/**
 * Allocate an unused Redis database index.
 *
 * @returns Database index (0-15)
 * @throws Error if all databases are in use
 */
function allocateDb() {
    for (let db = 0; db <= MAX_DB_INDEX; db++) {
        if (!allocatedDbs.has(db)) {
            allocatedDbs.add(db);
            return db;
        }
    }
    throw new Error('All Redis test databases (0-15) are in use. ' +
        'Ensure you call cleanupTestRedis() in afterEach.');
}
/**
 * Release a Redis database index.
 *
 * @param db - Database index to release
 */
function releaseDb(db) {
    allocatedDbs.delete(db);
}
/**
 * Create a test Redis client with isolated database.
 *
 * This allocates a unique Redis database index (0-15) for this test,
 * creates a client, and ensures the database is flushed before use.
 *
 * @param url - Optional Redis URL (defaults to REDIS_URL env var or localhost)
 * @returns Test Redis instance
 */
async function createTestRedis(url) {
    const db = allocateDb();
    const redisUrl = url || process.env.REDIS_URL || 'redis://localhost:6379';
    // Parse URL and append database index
    const urlObj = new URL(redisUrl);
    urlObj.pathname = `/${db}`;
    const fullUrl = urlObj.toString();
    // Create client
    const client = (0, redis_1.createClient)({ url: fullUrl });
    try {
        await client.connect();
        await client.flushDb(); // Clear database before use
    }
    catch (err) {
        releaseDb(db);
        throw new Error(`Failed to create test Redis client: ${err}`);
    }
    return {
        client,
        db,
        url: fullUrl,
    };
}
/**
 * Clean up test Redis (flush database and disconnect).
 *
 * @param redis - Test Redis instance
 */
async function cleanupTestRedis(redis) {
    if (!redis || !redis.client) {
        return;
    }
    try {
        if (redis.client.isOpen) {
            await redis.client.flushDb(); // Clear all data
            await redis.client.disconnect();
        }
    }
    catch (err) {
        console.error('Failed to cleanup test Redis:', err);
    }
    finally {
        releaseDb(redis.db);
    }
}
/**
 * Set a key in test Redis.
 *
 * @param redis - Test Redis instance
 * @param key - Key name
 * @param value - Value (will be JSON stringified if object)
 * @param ttlSeconds - Optional TTL in seconds
 */
async function setKey(redis, key, value, ttlSeconds) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
        await redis.client.setEx(key, ttlSeconds, stringValue);
    }
    else {
        await redis.client.set(key, stringValue);
    }
}
/**
 * Get a key from test Redis.
 *
 * @param redis - Test Redis instance
 * @param key - Key name
 * @param parseJson - Whether to parse as JSON (default: true)
 * @returns Value or null if not found
 */
async function getKey(redis, key, parseJson = true) {
    const value = await redis.client.get(key);
    if (value === null) {
        return null;
    }
    if (parseJson) {
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    return value;
}
/**
 * Delete a key from test Redis.
 *
 * @param redis - Test Redis instance
 * @param key - Key name
 */
async function deleteKey(redis, key) {
    await redis.client.del(key);
}
/**
 * Get all keys matching a pattern.
 *
 * @param redis - Test Redis instance
 * @param pattern - Key pattern (e.g., "user:*")
 * @returns Array of keys
 */
async function getKeys(redis, pattern = '*') {
    const keys = [];
    for await (const key of redis.client.scanIterator({ MATCH: pattern })) {
        keys.push(key);
    }
    return keys;
}
/**
 * Flush all keys in the test database.
 *
 * @param redis - Test Redis instance
 */
async function flushTestRedis(redis) {
    await redis.client.flushDb();
}
/**
 * Get the number of keys in the test database.
 *
 * @param redis - Test Redis instance
 * @returns Number of keys
 */
async function countKeys(redis) {
    return redis.client.dbSize();
}
