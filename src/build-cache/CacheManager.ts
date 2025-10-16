/**
 * Remote Build Cache Manager - Content Addressed Storage
 * Composer vNext Sprint: Shared cache between CI + dev machines
 */

import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface CacheEntry {
  key: string;
  contentHash: string;
  size: number;
  timestamp: string;
  metadata: {
    inputs: string[];
    toolchain: string;
    environment: Record<string, string>;
  };
}

export interface CacheConfig {
  localDir: string;
  remoteEndpoint?: string;
  ttlDays: number;
  maxSizeMB: number;
  compression: boolean;
}

export class CacheManager {
  private config: CacheConfig;
  private readonly cacheIndex: Map<string, CacheEntry> = new Map();
  private readonly contentStore: Map<string, Buffer> = new Map();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      localDir: '.maestro-cache',
      ttlDays: 7,
      maxSizeMB: 1000,
      compression: true,
      ...config,
    };

    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    await fs.mkdir(this.config.localDir, { recursive: true });

    // Load existing cache index
    const indexPath = path.join(this.config.localDir, 'index.json');
    try {
      const indexData = await fs.readFile(indexPath, 'utf8');
      const entries = JSON.parse(indexData) as CacheEntry[];

      for (const entry of entries) {
        if (!this.isExpired(entry)) {
          this.cacheIndex.set(entry.key, entry);
        }
      }

      console.log(
        `📦 Cache initialized: ${this.cacheIndex.size} entries loaded`,
      );
    } catch (error) {
      console.log('🔄 Starting with empty cache');
    }
  }

  /**
   * Generate content-addressed key from inputs
   */
  generateCacheKey(inputs: {
    sources: string[];
    toolchain: string;
    environment: Record<string, string>;
    command?: string;
  }): string {
    const hasher = crypto.createHash('sha256');

    // Hash sources (sorted for determinism)
    hasher.update('sources:');
    for (const source of inputs.sources.sort()) {
      hasher.update(source);
    }

    // Hash toolchain version
    hasher.update(`toolchain:${inputs.toolchain}`);

    // Hash relevant environment vars (sorted keys)
    hasher.update('env:');
    const envKeys = Object.keys(inputs.environment).sort();
    for (const key of envKeys) {
      hasher.update(`${key}=${inputs.environment[key]}`);
    }

    // Hash command if provided
    if (inputs.command) {
      hasher.update(`cmd:${inputs.command}`);
    }

    return hasher.digest('hex');
  }

  /**
   * Check if artifact exists in cache
   */
  async has(cacheKey: string): Promise<boolean> {
    const entry = this.cacheIndex.get(cacheKey);
    if (!entry || this.isExpired(entry)) {
      return false;
    }

    // Verify artifact file exists
    const artifactPath = path.join(this.config.localDir, `${cacheKey}.tar.gz`);
    try {
      await fs.access(artifactPath);
      return true;
    } catch {
      // Remove stale index entry
      this.cacheIndex.delete(cacheKey);
      return false;
    }
  }

  /**
   * Store build artifact in cache
   */
  async put(
    cacheKey: string,
    artifactPath: string,
    metadata: {
      inputs: string[];
      toolchain: string;
      environment: Record<string, string>;
    },
  ): Promise<void> {
    const contentHash = await this.hashFile(artifactPath);
    const stats = await fs.stat(artifactPath);

    const entry: CacheEntry = {
      key: cacheKey,
      contentHash,
      size: stats.size,
      timestamp: new Date().toISOString(),
      metadata,
    };

    // Store compressed artifact
    const targetPath = path.join(this.config.localDir, `${cacheKey}.tar.gz`);

    if (this.config.compression) {
      await this.compressFile(artifactPath, targetPath);
    } else {
      await fs.copyFile(artifactPath, targetPath);
    }

    this.cacheIndex.set(cacheKey, entry);
    await this.saveIndex();

    console.log(`💾 Cached: ${cacheKey} (${this.formatSize(stats.size)})`);

    // Cleanup if cache too large
    await this.enforceSize();
  }

  /**
   * Retrieve build artifact from cache
   */
  async get(cacheKey: string, targetPath: string): Promise<boolean> {
    if (!(await this.has(cacheKey))) {
      return false;
    }

    const sourcePath = path.join(this.config.localDir, `${cacheKey}.tar.gz`);

    try {
      if (this.config.compression) {
        await this.decompressFile(sourcePath, targetPath);
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }

      console.log(`🚀 Cache hit: ${cacheKey}`);
      return true;
    } catch (error) {
      console.warn(`⚠️  Cache read failed: ${error}`);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    totalSize: number;
    hitRate: number;
    oldestEntry: string | null;
  } {
    let totalSize = 0;
    let oldestDate = new Date();
    let oldestEntry = null;

    for (const [key, entry] of this.cacheIndex) {
      totalSize += entry.size;
      const entryDate = new Date(entry.timestamp);
      if (entryDate < oldestDate) {
        oldestDate = entryDate;
        oldestEntry = key;
      }
    }

    return {
      entries: this.cacheIndex.size,
      totalSize,
      hitRate: 0, // TODO: Track hit rate
      oldestEntry,
    };
  }

  /**
   * Clean expired entries
   */
  async cleanup(): Promise<number> {
    let cleaned = 0;

    for (const [key, entry] of this.cacheIndex) {
      if (this.isExpired(entry)) {
        await this.removeEntry(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      await this.saveIndex();
      console.log(`🧹 Cleaned ${cleaned} expired entries`);
    }

    return cleaned;
  }

  private isExpired(entry: CacheEntry): boolean {
    const age = Date.now() - new Date(entry.timestamp).getTime();
    return age > this.config.ttlDays * 24 * 60 * 60 * 1000;
  }

  private async hashFile(filePath: string): Promise<string> {
    const hasher = crypto.createHash('sha256');
    const stream = createReadStream(filePath);

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => hasher.update(chunk));
      stream.on('end', () => resolve(hasher.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async compressFile(
    sourcePath: string,
    targetPath: string,
  ): Promise<void> {
    const source = createReadStream(sourcePath);
    const target = createWriteStream(targetPath);
    const compress = gzip({ level: 6 });

    await pipeline(source, compress, target);
  }

  private async decompressFile(
    sourcePath: string,
    targetPath: string,
  ): Promise<void> {
    const source = createReadStream(sourcePath);
    const target = createWriteStream(targetPath);
    const decompress = gunzip();

    await pipeline(source, decompress, target);
  }

  private async saveIndex(): Promise<void> {
    const indexPath = path.join(this.config.localDir, 'index.json');
    const entries = Array.from(this.cacheIndex.values());

    await fs.writeFile(indexPath, JSON.stringify(entries, null, 2));
  }

  private async removeEntry(key: string): Promise<void> {
    this.cacheIndex.delete(key);

    const artifactPath = path.join(this.config.localDir, `${key}.tar.gz`);
    try {
      await fs.unlink(artifactPath);
    } catch {
      // File might already be deleted
    }
  }

  private async enforceSize(): Promise<void> {
    const maxBytes = this.config.maxSizeMB * 1024 * 1024;
    const stats = this.getStats();

    if (stats.totalSize <= maxBytes) {
      return;
    }

    // Remove oldest entries until under limit
    const sortedEntries = Array.from(this.cacheIndex.entries()).sort(
      ([, a], [, b]) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    let currentSize = stats.totalSize;
    let removed = 0;

    for (const [key, entry] of sortedEntries) {
      if (currentSize <= maxBytes) break;

      await this.removeEntry(key);
      currentSize -= entry.size;
      removed++;
    }

    if (removed > 0) {
      await this.saveIndex();
      console.log(`🗑️  Evicted ${removed} entries to enforce size limit`);
    }
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;

    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit++;
    }

    return `${size.toFixed(1)}${units[unit]}`;
  }
}

// Factory function for easy configuration
export function createCache(config?: Partial<CacheConfig>): CacheManager {
  return new CacheManager(config);
}
