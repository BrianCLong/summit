import { SemanticMemory } from './semanticMemory';
import { PromptCache } from './promptCache';

export interface MemorySystem {
  semantic: SemanticMemory;
  cache: PromptCache;
}

export class MaestroMemory {
  private static instance: MaestroMemory;
  public semantic: SemanticMemory;
  public cache: PromptCache;
  private projectRoot: string;

  private constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.semantic = new SemanticMemory(projectRoot);
    this.cache = new PromptCache(projectRoot);
  }

  static getInstance(projectRoot?: string): MaestroMemory {
    if (!MaestroMemory.instance) {
      MaestroMemory.instance = new MaestroMemory(projectRoot);
    }
    return MaestroMemory.instance;
  }

  async initialize(): Promise<void> {
    console.log('🧠 Initializing Maestro Memory System...');

    const start = Date.now();

    await Promise.all([this.semantic.initialize(), this.cache.initialize()]);

    const duration = Date.now() - start;
    console.log(`✅ Memory system ready (${duration}ms)`);

    // Log stats
    const [semanticStats, cacheStats] = await Promise.all([
      this.semantic.getStats(),
      this.cache.getStats(),
    ]);

    console.log(
      `📊 Semantic Memory: ${semanticStats.totalEntries} entries, ${(semanticStats.memorySize / 1024).toFixed(1)}KB`,
    );
    console.log(
      `💾 Prompt Cache: ${cacheStats.size} entries, hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`,
    );
  }

  async storeExperience(
    content: string,
    type: 'code' | 'error' | 'solution' | 'pattern' | 'context',
    success: boolean,
    metadata: Record<string, any> = {},
  ): Promise<string> {
    const memoryId = await this.semantic.store(content, type, {
      ...metadata,
      success,
    });

    // Also cache if it's a solution or pattern that worked
    if (success && (type === 'solution' || type === 'pattern')) {
      const cacheId = await this.cache.set(
        metadata.prompt || content,
        content,
        metadata.model || 'default',
        {
          success: true,
          cost: metadata.cost || 0,
          tokens: metadata.tokens || { input: 0, output: 0 },
          latency: metadata.latency || 0,
          context: metadata.context || {},
        },
        metadata.context || {},
      );

      console.log(`💾 Cached successful ${type}: ${cacheId}`);
    }

    return memoryId;
  }

  async recall(
    query: string,
    type?: string[],
    useCache: boolean = true,
  ): Promise<{
    cached?: any;
    semantic: any[];
    recommendations: string[];
  }> {
    const results = {
      cached: undefined,
      semantic: [],
      recommendations: [],
    };

    // Try cache first
    if (useCache) {
      const cached = await this.cache.get(query);
      if (cached) {
        results.cached = cached;
        results.recommendations.push('Found exact cached solution');
      }
    }

    // Search semantic memory
    const semanticResults = await this.semantic.retrieve({
      query,
      type,
      limit: 5,
      similarity: 0.6,
    });

    results.semantic = semanticResults;

    // Generate recommendations based on what we found
    if (semanticResults.length > 0) {
      const successfulResults = semanticResults.filter(
        (r) => r.entry.metadata.success,
      );
      const failedResults = semanticResults.filter(
        (r) => !r.entry.metadata.success,
      );

      if (successfulResults.length > 0) {
        results.recommendations.push(
          `Found ${successfulResults.length} successful similar experiences`,
        );
      }

      if (failedResults.length > 0) {
        results.recommendations.push(
          `⚠️ Found ${failedResults.length} failed attempts - avoid these patterns`,
        );
      }

      // Pattern analysis
      const patterns = semanticResults
        .filter((r) => r.entry.type === 'pattern')
        .map((r) => r.entry.metadata.tags)
        .flat();

      if (patterns.length > 0) {
        const uniquePatterns = [...new Set(patterns)];
        results.recommendations.push(
          `Related patterns: ${uniquePatterns.join(', ')}`,
        );
      }
    } else {
      results.recommendations.push(
        'No similar experiences found - exploring new territory',
      );
    }

    return results;
  }

  async learn(
    originalQuery: string,
    solution: string,
    success: boolean,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    // Store the learning experience
    await this.storeExperience(
      solution,
      success ? 'solution' : 'error',
      success,
      {
        ...metadata,
        originalQuery,
      },
    );

    // If this was successful, update related semantic memories
    if (success) {
      const relatedMemories = await this.semantic.retrieve({
        query: originalQuery,
        limit: 3,
        similarity: 0.7,
      });

      const solutionId = await this.semantic.store(solution, 'solution', {
        ...metadata,
        success: true,
      });

      // Create relations between the solution and related memories
      for (const memory of relatedMemories) {
        await this.semantic.addRelation(solutionId, memory.entry.id);
      }
    }
  }

  async cleanup(
    options: {
      semanticOlderThanDays?: number;
      cacheCleanup?: boolean;
      optimize?: boolean;
    } = {},
  ): Promise<{
    semantic: { removed: number };
    cache: {
      expired: number;
      invalidated: number;
      optimized?: { removed: number; compacted: number };
    };
  }> {
    console.log('🧹 Cleaning up memory system...');

    const results = {
      semantic: { removed: 0 },
      cache: { expired: 0, invalidated: 0, optimized: undefined as any },
    };

    // Cleanup semantic memory
    if (options.semanticOlderThanDays !== undefined) {
      results.semantic.removed = await this.semantic.cleanup(
        options.semanticOlderThanDays,
      );
    }

    // Cleanup cache
    if (options.cacheCleanup) {
      const cacheCleanup = await this.cache.cleanup();
      results.cache.expired = cacheCleanup.expired;
      results.cache.invalidated = cacheCleanup.invalidated;
    }

    // Optimize cache
    if (options.optimize) {
      results.cache.optimized = await this.cache.optimizeCache();
    }

    console.log(
      `🧹 Cleanup complete: ${results.semantic.removed} semantic entries, ${results.cache.expired + results.cache.invalidated} cache entries removed`,
    );

    return results;
  }

  async exportMemory(): Promise<{
    semantic: any[];
    cache: any[];
    stats: {
      semantic: any;
      cache: any;
    };
  }> {
    const [semanticStats, cacheStats] = await Promise.all([
      this.semantic.getStats(),
      this.cache.getStats(),
    ]);

    // This is a simplified export - in a real implementation,
    // you'd want to be more careful about sensitive data
    return {
      semantic: [], // Would export non-sensitive semantic memories
      cache: [], // Would export non-sensitive cache entries
      stats: {
        semantic: semanticStats,
        cache: cacheStats,
      },
    };
  }
}

// Utility functions for integration with agents
export async function withMemory<T>(
  operation: (memory: MaestroMemory) => Promise<T>,
  projectRoot?: string,
): Promise<T> {
  const memory = MaestroMemory.getInstance(projectRoot);
  await memory.initialize();
  return await operation(memory);
}

export async function cacheableOperation<T>(
  key: string,
  operation: () => Promise<T>,
  ttl: number = 3600,
  projectRoot?: string,
): Promise<T> {
  const memory = MaestroMemory.getInstance(projectRoot);
  await memory.initialize();

  // Check cache first
  const cached = await memory.cache.get(key);
  if (cached) {
    try {
      return JSON.parse(cached.response);
    } catch {
      return cached.response as any;
    }
  }

  // Execute operation
  const result = await operation();

  // Cache the result
  await memory.cache.set(
    key,
    JSON.stringify(result),
    'operation',
    { success: true },
    {},
    ttl,
  );

  return result;
}

export { SemanticMemory, PromptCache };
