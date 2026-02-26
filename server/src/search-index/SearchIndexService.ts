
import { RedisService } from '../db/redis';

export interface SearchableItem {
  id: string;
  type: string;
  content: string;
  createdAt: Date;
  [key: string]: unknown;
}

export interface SearchResult {
  id: string;
  score: number;
  match: Record<string, string[]>;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filter?: (result: SearchableItem) => boolean;
  queries?: string[];
  cache?: boolean;
}

export class SearchIndexService {
  private redis: RedisService;

  constructor() {
    this.redis = RedisService.getInstance();
  }

  async indexItem(item: SearchableItem): Promise<void> {
    const cacheKey = `search:index:${item.type}:${item.id}`;

    // Add to Redis for caching/retrieval
    const pipeline = this.redis.pipeline();
    pipeline.set(cacheKey, JSON.stringify(item as unknown as Record<string, unknown>));
    pipeline.expire(cacheKey, 3600); // 1 hour cache
    await pipeline.exec();
  }

  async removeItem(id: string, type: string): Promise<void> {
    const cacheKey = `search:index:${type}:${id}`;
    await this.redis.del(cacheKey);
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const cacheKey = options.cache ? `search:${query}` : undefined;

    if (cacheKey) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    // Mock search results
    let results: SearchResult[] = [];

    // Filter results if needed
    if (options.filter) {
      // Cast results to SearchableItem[] for filtering to match the interface,
      // though this is slightly unsafe it satisfies the compiler for the mock implementation
      results = (results as unknown as SearchableItem[]).filter(options.filter) as unknown as SearchResult[];
    }

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    if (cacheKey) {
      await this.redis.set(cacheKey, JSON.stringify(results), 'EX', 300);
    }

    return results;
  }

  async getIndexedItem(id: string, type: string): Promise<SearchableItem | null> {
    const cacheKey = `search:index:${type}:${id}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as SearchableItem;
    }

    return null;
  }

  async reindexAll(): Promise<void> {
    console.log('Starting full reindex...');
    // Implementation would go here
  }
}
