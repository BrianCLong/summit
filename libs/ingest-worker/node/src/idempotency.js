"use strict";
/**
 * Idempotency Store
 *
 * Provides exactly-once semantics by tracking processed dedupe keys
 * with configurable storage backends (Redis, PostgreSQL).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryIdempotencyStore = exports.PostgresIdempotencyStore = exports.RedisIdempotencyStore = void 0;
exports.createIdempotencyStore = createIdempotencyStore;
/**
 * Redis-backed idempotency store.
 */
class RedisIdempotencyStore {
    redis;
    config;
    constructor(redis, config) {
        this.redis = redis;
        this.config = config;
    }
    getKey(dedupeKey) {
        return `${this.config.keyPrefix}:${dedupeKey}`;
    }
    async has(key) {
        const result = await this.redis.exists(this.getKey(key));
        return result === 1;
    }
    async set(key, metadata) {
        const redisKey = this.getKey(key);
        const value = JSON.stringify({
            processedAt: new Date().toISOString(),
            metadata,
        });
        await this.redis.set(redisKey, value, 'EX', this.config.ttlSeconds);
    }
    async delete(key) {
        await this.redis.del(this.getKey(key));
    }
    async get(key) {
        const value = await this.redis.get(this.getKey(key));
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            return null;
        }
    }
    async checkAndSet(key, metadata) {
        const redisKey = this.getKey(key);
        const value = JSON.stringify({
            processedAt: new Date().toISOString(),
            metadata,
        });
        // Use SET NX EX for atomic check-and-set
        const result = await this.redis.set(redisKey, value, 'EX', this.config.ttlSeconds, 'NX');
        return result === 'OK';
    }
    async close() {
        // Redis connection is managed externally
    }
}
exports.RedisIdempotencyStore = RedisIdempotencyStore;
/**
 * PostgreSQL-backed idempotency store.
 */
class PostgresIdempotencyStore {
    pool;
    config;
    tableName;
    constructor(pool, config, tableName = 'ingest_idempotency') {
        this.pool = pool;
        this.config = config;
        this.tableName = tableName;
    }
    async initialize() {
        // Create table if not exists
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        dedupe_key VARCHAR(64) PRIMARY KEY,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB,
        expires_at TIMESTAMPTZ NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_expires
        ON ${this.tableName} (expires_at)
        WHERE expires_at < NOW();
    `);
    }
    async has(key) {
        const result = await this.pool.query(`SELECT 1 FROM ${this.tableName}
       WHERE dedupe_key = $1 AND expires_at > NOW()`, [key]);
        return (result.rowCount ?? 0) > 0;
    }
    async set(key, metadata) {
        const expiresAt = new Date(Date.now() + this.config.ttlSeconds * 1000);
        await this.pool.query(`INSERT INTO ${this.tableName} (dedupe_key, metadata, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (dedupe_key) DO UPDATE
       SET processed_at = NOW(), metadata = $2, expires_at = $3`, [key, metadata ? JSON.stringify(metadata) : null, expiresAt]);
    }
    async delete(key) {
        await this.pool.query(`DELETE FROM ${this.tableName} WHERE dedupe_key = $1`, [key]);
    }
    async get(key) {
        const result = await this.pool.query(`SELECT processed_at, metadata FROM ${this.tableName}
       WHERE dedupe_key = $1 AND expires_at > NOW()`, [key]);
        if (result.rowCount === 0)
            return null;
        const row = result.rows[0];
        return {
            processedAt: row.processed_at.toISOString(),
            metadata: row.metadata,
        };
    }
    async checkAndSet(key, metadata) {
        const expiresAt = new Date(Date.now() + this.config.ttlSeconds * 1000);
        try {
            const result = await this.pool.query(`INSERT INTO ${this.tableName} (dedupe_key, metadata, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (dedupe_key) DO NOTHING
         RETURNING dedupe_key`, [key, metadata ? JSON.stringify(metadata) : null, expiresAt]);
            return (result.rowCount ?? 0) > 0;
        }
        catch (error) {
            // Check if it's a duplicate key error
            if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
                return false;
            }
            throw error;
        }
    }
    async close() {
        // Pool is managed externally
    }
    /**
     * Clean up expired keys.
     */
    async cleanup() {
        const result = await this.pool.query(`DELETE FROM ${this.tableName} WHERE expires_at < NOW()`);
        return result.rowCount ?? 0;
    }
}
exports.PostgresIdempotencyStore = PostgresIdempotencyStore;
/**
 * In-memory idempotency store (for testing/development).
 */
class InMemoryIdempotencyStore {
    ttlSeconds;
    store = new Map();
    cleanupTimer = null;
    constructor(ttlSeconds = 3600) {
        this.ttlSeconds = ttlSeconds;
        // Start cleanup timer
        this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
    }
    async has(key) {
        const entry = this.store.get(key);
        if (!entry)
            return false;
        if (entry.expiresAt < Date.now()) {
            this.store.delete(key);
            return false;
        }
        return true;
    }
    async set(key, metadata) {
        this.store.set(key, {
            processedAt: new Date().toISOString(),
            metadata,
            expiresAt: Date.now() + this.ttlSeconds * 1000,
        });
    }
    async delete(key) {
        this.store.delete(key);
    }
    async get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt < Date.now()) {
            this.store.delete(key);
            return null;
        }
        return {
            processedAt: entry.processedAt,
            metadata: entry.metadata,
        };
    }
    async checkAndSet(key, metadata) {
        if (await this.has(key)) {
            return false;
        }
        await this.set(key, metadata);
        return true;
    }
    async close() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.store.clear();
    }
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (entry.expiresAt < now) {
                this.store.delete(key);
            }
        }
    }
    get size() {
        return this.store.size;
    }
}
exports.InMemoryIdempotencyStore = InMemoryIdempotencyStore;
/**
 * Create an idempotency store based on configuration.
 */
function createIdempotencyStore(config, redis, pgPool) {
    switch (config.storeType) {
        case 'redis':
            if (!redis) {
                throw new Error('Redis client required for redis idempotency store');
            }
            return new RedisIdempotencyStore(redis, config);
        case 'postgres':
            if (!pgPool) {
                throw new Error('PostgreSQL pool required for postgres idempotency store');
            }
            return new PostgresIdempotencyStore(pgPool, config);
        default:
            throw new Error(`Unknown idempotency store type: ${config.storeType}`);
    }
}
