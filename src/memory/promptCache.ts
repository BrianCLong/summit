import { createHash } from 'crypto';
import { readFile, writeFile, mkdir, access, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { LRUCache } from 'lru-cache';

interface CacheEntry {
  id: string;
  prompt: string;
  response: string;
  model: string;
  metadata: {
    timestamp: string;
    cost: number;
    tokens: {
      input: number;
      output: number;
    };
    latency: number;
    success: boolean;
    context: Record<string, any>;
  };
  tags: string[];
  ttl: number; // Time to live in seconds
}

interface CacheStats {
  hits: number;
  misses: number;
  totalQueries: number;
  hitRate: number;
  totalCostSaved: number;
  totalTokensSaved: number;
  size: number;
  diskSize: number;
}

export class PromptCache {
  private cache: LRUCache<string, CacheEntry>;
  private persistPath: string;
  private stats: CacheStats;
  private defaultTTL: number = 7 * 24 * 60 * 60; // 7 days
  private maxCacheSize: number = 1000;
  private similarityThreshold: number = 0.85;

  constructor(projectRoot: string = process.cwd(), maxSize: number = 1000) {
    this.persistPath = join(projectRoot, '.maestro', 'cache');
    this.maxCacheSize = maxSize;

    this.cache = new LRUCache({
      max: maxSize,
      ttl: this.defaultTTL * 1000, // LRU cache expects milliseconds
      updateAgeOnGet: true,
      allowStale: true,
    });

    this.stats = {
      hits: 0,
      misses: 0,
      totalQueries: 0,
      hitRate: 0,
      totalCostSaved: 0,
      totalTokensSaved: 0,
      size: 0,
      diskSize: 0,
    };
  }

  async initialize(): Promise<void> {
    try {
      await mkdir(this.persistPath, { recursive: true });
      await this.loadCache();
      await this.loadStats();
    } catch (error) {
      console.warn('Failed to initialize prompt cache:', error.message);
    }
  }

  async get(
    prompt: string,
    model: string = 'default',
    context: Record<string, any> = {},
  ): Promise<CacheEntry | null> {
    this.stats.totalQueries++;

    const cacheKey = this.generateCacheKey(prompt, model, context);
    let entry = this.cache.get(cacheKey);

    // Check for exact match first
    if (entry && this.isEntryValid(entry)) {
      this.stats.hits++;
      this.updateStats();
      entry.metadata.timestamp = new Date().toISOString(); // Update access time
      return entry;
    }

    // Check for similar prompts
    const similarEntry = await this.findSimilarPrompt(prompt, model, context);
    if (similarEntry && this.isEntryValid(similarEntry)) {
      this.stats.hits++;
      this.updateStats();

      // Cache the similar entry under the new key for faster future access
      const newEntry: CacheEntry = {
        ...similarEntry,
        id: cacheKey,
        prompt: prompt, // Update to exact prompt
        metadata: {
          ...similarEntry.metadata,
          timestamp: new Date().toISOString(),
        },
      };

      this.cache.set(cacheKey, newEntry);
      return newEntry;
    }

    this.stats.misses++;
    this.updateStats();
    return null;
  }

  async set(
    prompt: string,
    response: string,
    model: string = 'default',
    metadata: Partial<CacheEntry['metadata']> = {},
    context: Record<string, any> = {},
    ttl?: number,
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(prompt, model, context);

    const entry: CacheEntry = {
      id: cacheKey,
      prompt,
      response,
      model,
      metadata: {
        timestamp: new Date().toISOString(),
        cost: 0,
        tokens: { input: 0, output: 0 },
        latency: 0,
        success: true,
        context,
        ...metadata,
      },
      tags: this.extractTags(prompt, response, context),
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(cacheKey, entry);
    await this.persistEntry(entry);

    return cacheKey;
  }

  async invalidate(pattern: string | RegExp): Promise<number> {
    let count = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (typeof pattern === 'string') {
        if (
          entry.prompt.includes(pattern) ||
          entry.tags.some((tag) => tag.includes(pattern))
        ) {
          keysToDelete.push(key);
          count++;
        }
      } else if (pattern instanceof RegExp) {
        if (
          pattern.test(entry.prompt) ||
          entry.tags.some((tag) => pattern.test(tag))
        ) {
          keysToDelete.push(key);
          count++;
        }
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (count > 0) {
      await this.persistCache();
    }

    return count;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    await this.persistCache();

    // Reset stats but keep hit/miss history
    this.stats.size = 0;
    this.stats.diskSize = 0;
    await this.persistStats();
  }

  async cleanup(): Promise<{ expired: number; invalidated: number }> {
    const now = Date.now();
    let expired = 0;
    let invalidated = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const entryAge = now - new Date(entry.metadata.timestamp).getTime();

      // Remove expired entries
      if (entryAge > entry.ttl * 1000) {
        keysToDelete.push(key);
        expired++;
        continue;
      }

      // Remove entries with failed responses
      if (!entry.metadata.success) {
        keysToDelete.push(key);
        invalidated++;
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      await this.persistCache();
    }

    return { expired, invalidated };
  }

  async getStats(): Promise<CacheStats> {
    this.stats.size = this.cache.size;

    try {
      const files = await readdir(this.persistPath);
      let diskSize = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(this.persistPath, file);
          const stats = await stat(filePath);
          diskSize += stats.size;
        }
      }

      this.stats.diskSize = diskSize;
    } catch {
      this.stats.diskSize = 0;
    }

    return { ...this.stats };
  }

  async warmCache(
    prompts: {
      prompt: string;
      model?: string;
      context?: Record<string, any>;
    }[],
  ): Promise<void> {
    console.log(`🔥 Warming cache with ${prompts.length} prompts...`);

    for (const { prompt, model = 'default', context = {} } of prompts) {
      const cacheKey = this.generateCacheKey(prompt, model, context);

      // Only warm if not already cached
      if (!this.cache.has(cacheKey)) {
        // This would trigger actual API calls in a real implementation
        // For now, we'll just mark them as needing computation
        console.log(`Cache miss for: ${prompt.substring(0, 50)}...`);
      }
    }
  }

  async optimizeCache(): Promise<{ removed: number; compacted: number }> {
    const before = this.cache.size;

    // Remove least successful entries if cache is full
    if (this.cache.size >= this.maxCacheSize * 0.9) {
      const entries = Array.from(this.cache.entries())
        .map(([key, entry]) => ({ key, entry }))
        .sort((a, b) => {
          // Score based on success, cost saved, and recency
          const scoreA =
            (a.entry.metadata.success ? 1 : 0) +
            a.entry.metadata.cost * 0.1 +
            (Date.now() - new Date(a.entry.metadata.timestamp).getTime()) /
              (1000 * 60 * 60 * 24);
          const scoreB =
            (b.entry.metadata.success ? 1 : 0) +
            b.entry.metadata.cost * 0.1 +
            (Date.now() - new Date(b.entry.metadata.timestamp).getTime()) /
              (1000 * 60 * 60 * 24);
          return scoreA - scoreB;
        });

      const toRemove = Math.floor(this.maxCacheSize * 0.1);
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.cache.delete(entries[i].key);
      }
    }

    await this.persistCache();

    return {
      removed: before - this.cache.size,
      compacted: this.cache.size,
    };
  }

  private generateCacheKey(
    prompt: string,
    model: string,
    context: Record<string, any>,
  ): string {
    const contextStr = Object.keys(context)
      .sort()
      .map((key) => `${key}:${JSON.stringify(context[key])}`)
      .join('|');

    const combined = `${prompt}|${model}|${contextStr}`;

    return createHash('sha256').update(combined).digest('hex').substring(0, 32);
  }

  private async findSimilarPrompt(
    prompt: string,
    model: string,
    context: Record<string, any>,
  ): Promise<CacheEntry | null> {
    const promptTokens = this.tokenize(prompt.toLowerCase());
    let bestMatch: CacheEntry | null = null;
    let bestSimilarity = 0;

    for (const entry of this.cache.values()) {
      // Must match model and have similar context
      if (entry.model !== model) continue;

      const contextSimilarity = this.contextSimilarity(
        context,
        entry.metadata.context,
      );
      if (contextSimilarity < 0.8) continue;

      const entryTokens = this.tokenize(entry.prompt.toLowerCase());
      const similarity = this.jaccardSimilarity(promptTokens, entryTokens);

      const combinedSimilarity = similarity * 0.7 + contextSimilarity * 0.3;

      if (
        combinedSimilarity > bestSimilarity &&
        combinedSimilarity >= this.similarityThreshold
      ) {
        bestSimilarity = combinedSimilarity;
        bestMatch = entry;
      }
    }

    return bestMatch;
  }

  private tokenize(text: string): Set<string> {
    return new Set(
      text
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length > 2),
    );
  }

  private jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private contextSimilarity(
    ctx1: Record<string, any>,
    ctx2: Record<string, any>,
  ): number {
    const keys1 = Object.keys(ctx1);
    const keys2 = Object.keys(ctx2);

    if (keys1.length === 0 && keys2.length === 0) return 1;
    if (keys1.length === 0 || keys2.length === 0) return 0;

    const commonKeys = keys1.filter((key) => keys2.includes(key));
    const totalKeys = new Set([...keys1, ...keys2]).size;

    let matches = 0;
    for (const key of commonKeys) {
      if (JSON.stringify(ctx1[key]) === JSON.stringify(ctx2[key])) {
        matches++;
      }
    }

    return matches / totalKeys;
  }

  private extractTags(
    prompt: string,
    response: string,
    context: Record<string, any>,
  ): string[] {
    const tags: string[] = [];

    // Extract from context
    if (context.type) tags.push(context.type);
    if (context.language) tags.push(context.language);
    if (context.framework) tags.push(context.framework);

    // Extract from prompt content
    const patterns = {
      'code-generation': /generate|create|write.*code|implement/i,
      debugging: /debug|error|fix|problem|issue/i,
      explanation: /explain|what.*is|how.*does|describe/i,
      review: /review|check|validate|analyze/i,
      optimization: /optimize|improve|performance|speed/i,
      testing: /test|spec|unittest|coverage/i,
      documentation: /document|comment|readme|doc/i,
    };

    for (const [tag, pattern] of Object.entries(patterns)) {
      if (pattern.test(prompt)) {
        tags.push(tag);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  private isEntryValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const entryTime = new Date(entry.metadata.timestamp).getTime();
    const age = now - entryTime;

    return age <= entry.ttl * 1000 && entry.metadata.success;
  }

  private updateStats(): void {
    this.stats.hitRate =
      this.stats.totalQueries > 0
        ? this.stats.hits / this.stats.totalQueries
        : 0;
  }

  private async loadCache(): Promise<void> {
    try {
      const files = await readdir(this.persistPath);
      const cacheFiles = files.filter(
        (f) => f.startsWith('cache-') && f.endsWith('.json'),
      );

      for (const file of cacheFiles) {
        try {
          const filePath = join(this.persistPath, file);
          const data = await readFile(filePath, 'utf8');
          const entry: CacheEntry = JSON.parse(data);

          if (this.isEntryValid(entry)) {
            this.cache.set(entry.id, entry);
          }
        } catch (error) {
          console.warn(
            `Failed to load cache entry from ${file}:`,
            error.message,
          );
        }
      }
    } catch (error) {
      // Cache directory doesn't exist yet
    }
  }

  private async persistEntry(entry: CacheEntry): Promise<void> {
    try {
      const filename = `cache-${entry.id}.json`;
      const filePath = join(this.persistPath, filename);
      await writeFile(filePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      console.warn('Failed to persist cache entry:', error.message);
    }
  }

  private async persistCache(): Promise<void> {
    try {
      // Remove old cache files
      const files = await readdir(this.persistPath);
      const cacheFiles = files.filter(
        (f) => f.startsWith('cache-') && f.endsWith('.json'),
      );

      for (const file of cacheFiles) {
        const filePath = join(this.persistPath, file);
        try {
          await import('fs/promises').then((fs) => fs.unlink(filePath));
        } catch {} // Ignore errors
      }

      // Write current cache entries
      for (const entry of this.cache.values()) {
        await this.persistEntry(entry);
      }
    } catch (error) {
      console.warn('Failed to persist cache:', error.message);
    }
  }

  private async loadStats(): Promise<void> {
    try {
      const statsPath = join(this.persistPath, 'stats.json');
      await access(statsPath);

      const data = await readFile(statsPath, 'utf8');
      const savedStats = JSON.parse(data);

      // Merge with current stats
      this.stats = {
        ...this.stats,
        ...savedStats,
        size: this.cache.size, // Always use current size
      };
    } catch {
      // Stats file doesn't exist, use defaults
    }
  }

  private async persistStats(): Promise<void> {
    try {
      const statsPath = join(this.persistPath, 'stats.json');
      await writeFile(statsPath, JSON.stringify(this.stats, null, 2));
    } catch (error) {
      console.warn('Failed to persist stats:', error.message);
    }
  }
}
