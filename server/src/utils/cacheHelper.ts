import { cacheService } from '../services/CacheService.js';

/**
 * Wraps a resolver function with caching.
 * @param keyGenerator Function to generate cache key from arguments
 * @param resolver The original resolver function
 * @param ttl Time to live in seconds
 */
export const withCache = <TArgs = any, TResult = any>(
  keyGenerator: (parent: any, args: TArgs, context: any, info: any) => string,
  resolver: (parent: any, args: TArgs, context: any, info: any) => Promise<TResult>,
  ttl?: number
) => {
  return async (parent: any, args: TArgs, context: any, info: any): Promise<TResult> => {
    const key = keyGenerator(parent, args, context, info);

    return cacheService.getOrSet(
      key,
      () => resolver(parent, args, context, info),
      ttl
    );
  };
};
