import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { Redis } from 'ioredis';
import { MultiTierCache } from './MultiTierCache';

const logger = pino({ name: 'CacheVersionManager' });
const tracer = trace.getTracer('advanced-caching');

/**
 * Manages cache versioning for safe updates
 */
export class CacheVersionManager {
  private currentVersions: Map<string, number> = new Map();

  constructor(
    private cache: MultiTierCache,
    private redis?: Redis
  ) {
    if (redis) {
      this.loadVersions();
    }
  }

  /**
   * Get current version for a key
   */
  async getVersion(key: string): Promise<number> {
    // Check local cache first
    if (this.currentVersions.has(key)) {
      return this.currentVersions.get(key)!;
    }

    // Check Redis
    if (this.redis) {
      const version = await this.redis.get(`cache:version:${key}`);
      if (version) {
        const v = parseInt(version, 10);
        this.currentVersions.set(key, v);
        return v;
      }
    }

    // Default to version 1
    return 1;
  }

  /**
   * Increment version (invalidates old cached versions)
   */
  async incrementVersion(key: string): Promise<number> {
    const span = tracer.startSpan('CacheVersionManager.incrementVersion');

    try {
      const currentVersion = await this.getVersion(key);
      const newVersion = currentVersion + 1;

      // Update local cache
      this.currentVersions.set(key, newVersion);

      // Update Redis
      if (this.redis) {
        await this.redis.set(`cache:version:${key}`, newVersion.toString());
      }

      // Invalidate old cached values
      await this.cache.delete(key);

      span.setAttributes({
        key,
        oldVersion: currentVersion,
        newVersion,
      });

      logger.info({ key, version: newVersion }, 'Cache version incremented');

      return newVersion;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Set specific version
   */
  async setVersion(key: string, version: number): Promise<void> {
    this.currentVersions.set(key, version);

    if (this.redis) {
      await this.redis.set(`cache:version:${key}`, version.toString());
    }

    logger.debug({ key, version }, 'Cache version set');
  }

  /**
   * Check if cached value version is current
   */
  async isVersionCurrent(key: string, cachedVersion?: number): Promise<boolean> {
    if (!cachedVersion) {
      return false;
    }

    const currentVersion = await this.getVersion(key);
    return cachedVersion === currentVersion;
  }

  /**
   * Get versioned key
   */
  getVersionedKey(key: string, version?: number): string {
    const v = version || this.currentVersions.get(key) || 1;
    return `${key}:v${v}`;
  }

  /**
   * Batch increment versions
   */
  async incrementVersions(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.incrementVersion(key)));
    logger.info({ count: keys.length }, 'Batch version increment completed');
  }

  /**
   * Increment version by pattern
   */
  async incrementVersionsByPattern(pattern: string): Promise<number> {
    const span = tracer.startSpan('CacheVersionManager.incrementVersionsByPattern');

    try {
      if (!this.redis) {
        throw new Error('Redis required for pattern operations');
      }

      const versionKeys = await this.redis.keys(`cache:version:${pattern}`);
      const keys = versionKeys.map((k) => k.replace('cache:version:', ''));

      await this.incrementVersions(keys);

      span.setAttribute('count', keys.length);
      return keys.length;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Load versions from Redis
   */
  private async loadVersions(): Promise<void> {
    if (!this.redis) return;

    try {
      const keys = await this.redis.keys('cache:version:*');

      for (const key of keys) {
        const cacheKey = key.replace('cache:version:', '');
        const version = await this.redis.get(key);

        if (version) {
          this.currentVersions.set(cacheKey, parseInt(version, 10));
        }
      }

      logger.info({ count: keys.length }, 'Cache versions loaded');
    } catch (error) {
      logger.error({ error }, 'Failed to load cache versions');
    }
  }

  /**
   * Clear all versions
   */
  async clear(): Promise<void> {
    this.currentVersions.clear();

    if (this.redis) {
      const keys = await this.redis.keys('cache:version:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }

    logger.info('Cache versions cleared');
  }

  /**
   * Get version statistics
   */
  getStats() {
    return {
      totalKeys: this.currentVersions.size,
      versions: Array.from(this.currentVersions.entries()).map(
        ([key, version]) => ({ key, version })
      ),
    };
  }
}
