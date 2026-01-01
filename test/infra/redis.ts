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

import { createClient, RedisClientType } from 'redis';

export interface TestRedis {
  client: RedisClientType;
  db: number;
  url: string;
}

// Track allocated database indices
const allocatedDbs = new Set<number>();
const MAX_DB_INDEX = 15; // Redis supports 0-15 by default

/**
 * Allocate an unused Redis database index.
 *
 * @returns Database index (0-15)
 * @throws Error if all databases are in use
 */
function allocateDb(): number {
  for (let db = 0; db <= MAX_DB_INDEX; db++) {
    if (!allocatedDbs.has(db)) {
      allocatedDbs.add(db);
      return db;
    }
  }

  throw new Error(
    'All Redis test databases (0-15) are in use. ' +
      'Ensure you call cleanupTestRedis() in afterEach.'
  );
}

/**
 * Release a Redis database index.
 *
 * @param db - Database index to release
 */
function releaseDb(db: number): void {
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
export async function createTestRedis(url?: string): Promise<TestRedis> {
  const db = allocateDb();
  const redisUrl = url || process.env.REDIS_URL || 'redis://localhost:6379';

  // Parse URL and append database index
  const urlObj = new URL(redisUrl);
  urlObj.pathname = `/${db}`;
  const fullUrl = urlObj.toString();

  // Create client
  const client = createClient({ url: fullUrl });

  try {
    await client.connect();
    await client.flushDb(); // Clear database before use
  } catch (err) {
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
export async function cleanupTestRedis(redis: TestRedis): Promise<void> {
  if (!redis || !redis.client) {
    return;
  }

  try {
    if (redis.client.isOpen) {
      await redis.client.flushDb(); // Clear all data
      await redis.client.disconnect();
    }
  } catch (err) {
    console.error('Failed to cleanup test Redis:', err);
  } finally {
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
export async function setKey(
  redis: TestRedis,
  key: string,
  value: any,
  ttlSeconds?: number
): Promise<void> {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

  if (ttlSeconds) {
    await redis.client.setEx(key, ttlSeconds, stringValue);
  } else {
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
export async function getKey<T = any>(
  redis: TestRedis,
  key: string,
  parseJson: boolean = true
): Promise<T | null> {
  const value = await redis.client.get(key);

  if (value === null) {
    return null;
  }

  if (parseJson) {
    try {
      return JSON.parse(value);
    } catch {
      return value as any;
    }
  }

  return value as any;
}

/**
 * Delete a key from test Redis.
 *
 * @param redis - Test Redis instance
 * @param key - Key name
 */
export async function deleteKey(redis: TestRedis, key: string): Promise<void> {
  await redis.client.del(key);
}

/**
 * Get all keys matching a pattern.
 *
 * @param redis - Test Redis instance
 * @param pattern - Key pattern (e.g., "user:*")
 * @returns Array of keys
 */
export async function getKeys(redis: TestRedis, pattern: string = '*'): Promise<string[]> {
  const keys: string[] = [];

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
export async function flushTestRedis(redis: TestRedis): Promise<void> {
  await redis.client.flushDb();
}

/**
 * Get the number of keys in the test database.
 *
 * @param redis - Test Redis instance
 * @returns Number of keys
 */
export async function countKeys(redis: TestRedis): Promise<number> {
  return redis.client.dbSize();
}
