import { createHash } from 'node:crypto';

/**
 * Cache key builder for consistent key generation
 */
export class CacheKeyBuilder {
  private parts: string[] = [];
  private hashData: unknown[] = [];

  /**
   * Add a namespace part
   */
  namespace(ns: string): this {
    this.parts.push(ns);
    return this;
  }

  /**
   * Add an entity type
   */
  entity(type: string): this {
    this.parts.push(type);
    return this;
  }

  /**
   * Add an ID
   */
  id(id: string | number): this {
    this.parts.push(String(id));
    return this;
  }

  /**
   * Add a version
   */
  version(v: string | number): this {
    this.parts.push(`v${v}`);
    return this;
  }

  /**
   * Add an action
   */
  action(action: string): this {
    this.parts.push(action);
    return this;
  }

  /**
   * Add data to be hashed
   */
  hash(data: unknown): this {
    this.hashData.push(data);
    return this;
  }

  /**
   * Add a timestamp bucket (for time-based invalidation)
   */
  timeBucket(intervalSeconds: number): this {
    const bucket = Math.floor(Date.now() / 1000 / intervalSeconds);
    this.parts.push(`t${bucket}`);
    return this;
  }

  /**
   * Build the final key
   */
  build(): string {
    let key = this.parts.join(':');

    if (this.hashData.length > 0) {
      const dataStr = JSON.stringify(this.hashData);
      const hash = createHash('sha256')
        .update(dataStr)
        .digest('hex')
        .substring(0, 16);
      key += `:${hash}`;
    }

    return key;
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.parts = [];
    this.hashData = [];
    return this;
  }

  /**
   * Create a new builder with preset namespace
   */
  static withNamespace(namespace: string): CacheKeyBuilder {
    return new CacheKeyBuilder().namespace(namespace);
  }
}

/**
 * Predefined key patterns for Summit entities
 */
export const SummitKeys = {
  /**
   * Entity cache key
   */
  entity: (id: string) =>
    new CacheKeyBuilder()
      .namespace('summit')
      .entity('entity')
      .id(id)
      .build(),

  /**
   * Investigation cache key
   */
  investigation: (id: string) =>
    new CacheKeyBuilder()
      .namespace('summit')
      .entity('investigation')
      .id(id)
      .build(),

  /**
   * Entity relationships cache key
   */
  relationships: (entityId: string, depth: number) =>
    new CacheKeyBuilder()
      .namespace('summit')
      .entity('entity')
      .id(entityId)
      .action('relationships')
      .hash({ depth })
      .build(),

  /**
   * Search results cache key
   */
  search: (query: string, filters: Record<string, unknown>) =>
    new CacheKeyBuilder()
      .namespace('summit')
      .action('search')
      .hash({ query, filters })
      .build(),

  /**
   * User session cache key
   */
  session: (token: string) =>
    new CacheKeyBuilder()
      .namespace('summit')
      .entity('session')
      .hash(token)
      .build(),

  /**
   * Query result cache key
   */
  query: (queryHash: string) =>
    new CacheKeyBuilder()
      .namespace('summit')
      .action('query')
      .id(queryHash)
      .build(),

  /**
   * Graph traversal cache key
   */
  traversal: (startNode: string, pattern: string, depth: number) =>
    new CacheKeyBuilder()
      .namespace('summit')
      .action('traversal')
      .id(startNode)
      .hash({ pattern, depth })
      .build(),
};
