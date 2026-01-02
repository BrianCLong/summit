/**
 * Performance Optimizations - Caching and Parallelization
 *
 * Dramatically speeds up processing through intelligent caching
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { GitHubIssue, GitHubPR } from './types.js';

const CACHE_DIR = join(process.cwd(), 'tools/issue-sweeper/.cache');
const CACHE_FILE = join(CACHE_DIR, 'cache.json');
const CACHE_VERSION = '1.0.0';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface Cache {
  issues: Record<number, CacheEntry<GitHubIssue>>;
  prs: Record<string, CacheEntry<GitHubPR[]>>;
  searches: Record<string, CacheEntry<any>>;
  metadata: {
    version: string;
    created: number;
    lastUpdated: number;
  };
}

export class PerformanceCache {
  private cache: Cache;
  private dirty: boolean = false;

  constructor() {
    this.cache = this.loadCache();
  }

  /**
   * Load cache from disk
   */
  private loadCache(): Cache {
    if (!existsSync(CACHE_FILE)) {
      return this.createEmptyCache();
    }

    try {
      const data = readFileSync(CACHE_FILE, 'utf-8');
      const cache = JSON.parse(data) as Cache;

      // Check version compatibility
      if (cache.metadata.version !== CACHE_VERSION) {
        console.log('⚠️  Cache version mismatch, creating new cache');
        return this.createEmptyCache();
      }

      return cache;
    } catch (error) {
      console.error('❌ Failed to load cache:', error);
      return this.createEmptyCache();
    }
  }

  /**
   * Create empty cache structure
   */
  private createEmptyCache(): Cache {
    return {
      issues: {},
      prs: {},
      searches: {},
      metadata: {
        version: CACHE_VERSION,
        created: Date.now(),
        lastUpdated: Date.now(),
      },
    };
  }

  /**
   * Save cache to disk
   */
  save(): void {
    if (!this.dirty) return;

    try {
      // Ensure cache directory exists
      const fs = require('fs');
      if (!existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }

      this.cache.metadata.lastUpdated = Date.now();
      writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2), 'utf-8');
      this.dirty = false;
    } catch (error) {
      console.error('❌ Failed to save cache:', error);
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isValid<T>(entry: CacheEntry<T> | undefined): boolean {
    if (!entry) return false;
    if (entry.version !== CACHE_VERSION) return false;

    const age = Date.now() - entry.timestamp;
    return age < CACHE_TTL;
  }

  /**
   * Cache issue data
   */
  cacheIssue(issue: GitHubIssue): void {
    this.cache.issues[issue.number] = {
      data: issue,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    this.dirty = true;
  }

  /**
   * Get cached issue
   */
  getIssue(issueNumber: number): GitHubIssue | null {
    const entry = this.cache.issues[issueNumber];
    return this.isValid(entry) ? entry.data : null;
  }

  /**
   * Cache PR search results
   */
  cachePRSearch(query: string, prs: GitHubPR[]): void {
    this.cache.prs[query] = {
      data: prs,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    this.dirty = true;
  }

  /**
   * Get cached PR search
   */
  getPRSearch(query: string): GitHubPR[] | null {
    const entry = this.cache.prs[query];
    return this.isValid(entry) ? entry.data : null;
  }

  /**
   * Cache generic search results
   */
  cacheSearch(key: string, results: any): void {
    this.cache.searches[key] = {
      data: results,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    this.dirty = true;
  }

  /**
   * Get cached search results
   */
  getSearch(key: string): any | null {
    const entry = this.cache.searches[key];
    return this.isValid(entry) ? entry.data : null;
  }

  /**
   * Clear expired cache entries
   */
  clearExpired(): number {
    let cleared = 0;

    // Clear expired issues
    for (const [key, entry] of Object.entries(this.cache.issues)) {
      if (!this.isValid(entry)) {
        delete this.cache.issues[parseInt(key)];
        cleared++;
      }
    }

    // Clear expired PRs
    for (const [key, entry] of Object.entries(this.cache.prs)) {
      if (!this.isValid(entry)) {
        delete this.cache.prs[key];
        cleared++;
      }
    }

    // Clear expired searches
    for (const [key, entry] of Object.entries(this.cache.searches)) {
      if (!this.isValid(entry)) {
        delete this.cache.searches[key];
        cleared++;
      }
    }

    if (cleared > 0) {
      this.dirty = true;
    }

    return cleared;
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache = this.createEmptyCache();
    this.dirty = true;
    this.save();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    issues: number;
    prs: number;
    searches: number;
    size: number;
    hitRate: number;
  } {
    const size = JSON.stringify(this.cache).length;

    return {
      issues: Object.keys(this.cache.issues).length,
      prs: Object.keys(this.cache.prs).length,
      searches: Object.keys(this.cache.searches).length,
      size,
      hitRate: 0, // Would need tracking for accurate hit rate
    };
  }
}

/**
 * Parallel processing utilities
 */
export class ParallelProcessor {
  /**
   * Process array in parallel with concurrency limit
   */
  static async map<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    concurrency: number = 5
  ): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const promise = fn(items[i], i).then((result) => {
        results[i] = result;
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex((p) => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Process array in batches
   */
  static async batch<T, R>(
    items: T[],
    fn: (batch: T[]) => Promise<R[]>,
    batchSize: number = 10
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await fn(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Retry with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Debounce async function
   */
  static debounce<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let timeoutId: NodeJS.Timeout | null = null;
    let pendingPromise: Promise<ReturnType<T>> | null = null;

    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!pendingPromise) {
        pendingPromise = new Promise((resolve, reject) => {
          timeoutId = setTimeout(async () => {
            try {
              const result = await fn(...args);
              resolve(result);
            } catch (error) {
              reject(error);
            } finally {
              pendingPromise = null;
            }
          }, delay);
        });
      }

      return pendingPromise;
    };
  }
}

/**
 * Memoization decorator for expensive operations
 */
export class Memoizer {
  private cache: Map<string, { value: any; timestamp: number }> = new Map();
  private ttl: number;

  constructor(ttl: number = 60000) {
    // 1 minute default
    this.ttl = ttl;
  }

  /**
   * Memoize a function
   */
  memoize<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: any[]) => {
      const key = JSON.stringify(args);
      const cached = this.cache.get(key);

      if (cached && Date.now() - cached.timestamp < this.ttl) {
        return cached.value;
      }

      const result = fn(...args);

      // Handle promises
      if (result instanceof Promise) {
        return result.then((value) => {
          this.cache.set(key, { value, timestamp: Date.now() });
          return value;
        });
      }

      this.cache.set(key, { value: result, timestamp: Date.now() });
      return result;
    }) as T;
  }

  /**
   * Clear memoization cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    let cleared = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.ttl) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }
}

/**
 * Global cache instance
 */
export const globalCache = new PerformanceCache();

/**
 * Save cache on exit
 */
process.on('exit', () => {
  globalCache.save();
});

process.on('SIGINT', () => {
  globalCache.save();
  process.exit(0);
});

process.on('SIGTERM', () => {
  globalCache.save();
  process.exit(0);
});
