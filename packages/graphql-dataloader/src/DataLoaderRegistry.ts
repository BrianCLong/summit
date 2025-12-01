import DataLoader from 'dataloader';
import pino from 'pino';

const logger = pino({ name: 'DataLoaderRegistry' });

/**
 * Registry for managing DataLoader instances per request
 */
export class DataLoaderRegistry {
  private loaders: Map<string, DataLoader<any, any>> = new Map();

  /**
   * Register a loader
   */
  register<K, V>(name: string, loader: DataLoader<K, V>): void {
    this.loaders.set(name, loader);
    logger.debug({ name }, 'Loader registered');
  }

  /**
   * Get a loader by name
   */
  get<K, V>(name: string): DataLoader<K, V> | undefined {
    return this.loaders.get(name);
  }

  /**
   * Get or create a loader
   */
  getOrCreate<K, V>(
    name: string,
    factory: () => DataLoader<K, V>
  ): DataLoader<K, V> {
    if (!this.loaders.has(name)) {
      const loader = factory();
      this.register(name, loader);
    }
    return this.loaders.get(name)!;
  }

  /**
   * Clear all loaders (call this after each request)
   */
  clear(): void {
    for (const loader of this.loaders.values()) {
      loader.clearAll();
    }
    this.loaders.clear();
    logger.debug('All loaders cleared');
  }

  /**
   * Get cache hit statistics
   */
  getStats() {
    const stats: Record<string, any> = {};

    for (const [name, loader] of this.loaders.entries()) {
      // DataLoader doesn't expose internal stats, but we can track custom metrics
      stats[name] = {
        cacheSize: (loader as any)._promiseCache?.size || 0,
      };
    }

    return stats;
  }

  /**
   * Prime a loader's cache
   */
  prime<K, V>(name: string, key: K, value: V): void {
    const loader = this.loaders.get(name);
    if (loader) {
      loader.prime(key, value);
      logger.debug({ name, key }, 'Loader cache primed');
    }
  }

  /**
   * Clear specific loader's cache
   */
  clearLoader(name: string): void {
    const loader = this.loaders.get(name);
    if (loader) {
      loader.clearAll();
      logger.debug({ name }, 'Loader cache cleared');
    }
  }
}
