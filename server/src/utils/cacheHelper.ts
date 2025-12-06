import { cacheService } from '../services/cacheService.js';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  tenantId?: string;
}

/**
 * Wraps a resolver function with caching.
 * @param keyGenerator Function to generate cache key from arguments
 * @param resolver The original resolver function
 * @param options Cache options (ttl, tags, tenantId) or just ttl
 */
export const withCache = <TArgs = any, TResult = any>(
  keyGenerator: (parent: any, args: TArgs, context: any, info: any) => string,
  resolver: (parent: any, args: TArgs, context: any, info: any) => Promise<TResult>,
  options?: number | CacheOptions
) => {
  return async (parent: any, args: TArgs, context: any, info: any): Promise<TResult> => {
    const key = keyGenerator(parent, args, context, info);

    let ttl: number | undefined;
    let tags: string[] | undefined;
    let tenantId: string | undefined;

    if (typeof options === 'number') {
      ttl = options;
    } else if (options) {
      ttl = options.ttl;
      tags = options.tags;
      tenantId = options.tenantId;
    }

    // Attempt to extract tenantId from context if not explicitly provided
    if (!tenantId && context?.tenantId) {
        tenantId = context.tenantId;
    }

    // Prefix key with tenantId if available for isolation
    const finalKey = tenantId ? `${tenantId}:${key}` : key;

    return cacheService.getOrSet(
      finalKey,
      () => resolver(parent, args, context, info),
      ttl
    );
  };
};

/**
 * Creates a standard cache key for entity retrieval
 */
export const entityCacheKey = (type: string, id: string) => `entity:${type}:${id}`;

/**
 * Creates a standard cache key for search/list results
 */
export const listCacheKey = (type: string, params: Record<string, any>) =>
  `list:${type}:${JSON.stringify(params)}`;
