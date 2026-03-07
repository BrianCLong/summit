/**
 * Idempotency Store
 *
 * Provides exactly-once semantics by tracking processed dedupe keys
 * with configurable storage backends (Redis, PostgreSQL).
 */

import type { IdempotencyConfig } from "./types.js";

export interface IdempotencyStore {
  /**
   * Check if a key has been processed.
   */
  has(key: string): Promise<boolean>;

  /**
   * Mark a key as processed.
   */
  set(key: string, metadata?: Record<string, unknown>): Promise<void>;

  /**
   * Remove a key (for reprocessing).
   */
  delete(key: string): Promise<void>;

  /**
   * Get metadata for a processed key.
   */
  get(key: string): Promise<{ processedAt: string; metadata?: Record<string, unknown> } | null>;

  /**
   * Check and set atomically - returns true if key was new.
   */
  checkAndSet(key: string, metadata?: Record<string, unknown>): Promise<boolean>;

  /**
   * Close the store.
   */
  close(): Promise<void>;
}

/**
 * Redis-backed idempotency store.
 */
export class RedisIdempotencyStore implements IdempotencyStore {
  constructor(
    private redis: import("ioredis").default,
    private config: IdempotencyConfig
  ) {}

  private getKey(dedupeKey: string): string {
    return `${this.config.keyPrefix}:${dedupeKey}`;
  }

  async has(key: string): Promise<boolean> {
    const result = await this.redis.exists(this.getKey(key));
    return result === 1;
  }

  async set(key: string, metadata?: Record<string, unknown>): Promise<void> {
    const redisKey = this.getKey(key);
    const value = JSON.stringify({
      processedAt: new Date().toISOString(),
      metadata,
    });

    await this.redis.set(redisKey, value, "EX", this.config.ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(this.getKey(key));
  }

  async get(
    key: string
  ): Promise<{ processedAt: string; metadata?: Record<string, unknown> } | null> {
    const value = await this.redis.get(this.getKey(key));
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async checkAndSet(key: string, metadata?: Record<string, unknown>): Promise<boolean> {
    const redisKey = this.getKey(key);
    const value = JSON.stringify({
      processedAt: new Date().toISOString(),
      metadata,
    });

    // Use SET NX EX for atomic check-and-set
    const result = await this.redis.set(redisKey, value, "EX", this.config.ttlSeconds, "NX");
    return result === "OK";
  }

  async close(): Promise<void> {
    // Redis connection is managed externally
  }
}

/**
 * PostgreSQL-backed idempotency store.
 */
export class PostgresIdempotencyStore implements IdempotencyStore {
  constructor(
    private pool: import("pg").Pool,
    private config: IdempotencyConfig,
    private tableName: string = "ingest_idempotency"
  ) {}

  async initialize(): Promise<void> {
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

  async has(key: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM ${this.tableName}
       WHERE dedupe_key = $1 AND expires_at > NOW()`,
      [key]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async set(key: string, metadata?: Record<string, unknown>): Promise<void> {
    const expiresAt = new Date(Date.now() + this.config.ttlSeconds * 1000);

    await this.pool.query(
      `INSERT INTO ${this.tableName} (dedupe_key, metadata, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (dedupe_key) DO UPDATE
       SET processed_at = NOW(), metadata = $2, expires_at = $3`,
      [key, metadata ? JSON.stringify(metadata) : null, expiresAt]
    );
  }

  async delete(key: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.tableName} WHERE dedupe_key = $1`, [key]);
  }

  async get(
    key: string
  ): Promise<{ processedAt: string; metadata?: Record<string, unknown> } | null> {
    const result = await this.pool.query(
      `SELECT processed_at, metadata FROM ${this.tableName}
       WHERE dedupe_key = $1 AND expires_at > NOW()`,
      [key]
    );

    if (result.rowCount === 0) return null;

    const row = result.rows[0];
    return {
      processedAt: row.processed_at.toISOString(),
      metadata: row.metadata,
    };
  }

  async checkAndSet(key: string, metadata?: Record<string, unknown>): Promise<boolean> {
    const expiresAt = new Date(Date.now() + this.config.ttlSeconds * 1000);

    try {
      const result = await this.pool.query(
        `INSERT INTO ${this.tableName} (dedupe_key, metadata, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (dedupe_key) DO NOTHING
         RETURNING dedupe_key`,
        [key, metadata ? JSON.stringify(metadata) : null, expiresAt]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      // Check if it's a duplicate key error
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        return false;
      }
      throw error;
    }
  }

  async close(): Promise<void> {
    // Pool is managed externally
  }

  /**
   * Clean up expired keys.
   */
  async cleanup(): Promise<number> {
    const result = await this.pool.query(`DELETE FROM ${this.tableName} WHERE expires_at < NOW()`);
    return result.rowCount ?? 0;
  }
}

/**
 * In-memory idempotency store (for testing/development).
 */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private store: Map<
    string,
    { processedAt: string; metadata?: Record<string, unknown>; expiresAt: number }
  > = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private ttlSeconds: number = 3600) {
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  async set(key: string, metadata?: Record<string, unknown>): Promise<void> {
    this.store.set(key, {
      processedAt: new Date().toISOString(),
      metadata,
      expiresAt: Date.now() + this.ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async get(
    key: string
  ): Promise<{ processedAt: string; metadata?: Record<string, unknown> } | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return {
      processedAt: entry.processedAt,
      metadata: entry.metadata,
    };
  }

  async checkAndSet(key: string, metadata?: Record<string, unknown>): Promise<boolean> {
    if (await this.has(key)) {
      return false;
    }

    await this.set(key, metadata);
    return true;
  }

  async close(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }

  get size(): number {
    return this.store.size;
  }
}

/**
 * Create an idempotency store based on configuration.
 */
export function createIdempotencyStore(
  config: IdempotencyConfig,
  redis?: import("ioredis").default,
  pgPool?: import("pg").Pool
): IdempotencyStore {
  switch (config.storeType) {
    case "redis":
      if (!redis) {
        throw new Error("Redis client required for redis idempotency store");
      }
      return new RedisIdempotencyStore(redis, config);

    case "postgres":
      if (!pgPool) {
        throw new Error("PostgreSQL pool required for postgres idempotency store");
      }
      return new PostgresIdempotencyStore(pgPool, config);

    default:
      throw new Error(`Unknown idempotency store type: ${config.storeType}`);
  }
}
