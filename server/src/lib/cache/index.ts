import { MultiTierCache } from './multi-tier-cache.js';

/**
 * A singleton instance of the MultiTierCache.
 * This ensures that the same cache instance is used throughout the application,
 * which is crucial for consistency and efficient resource management.
 */
export const cache = new MultiTierCache();
