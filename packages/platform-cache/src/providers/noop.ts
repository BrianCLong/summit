import type { CacheProvider } from '../types.js';

/**
 * No-op cache provider for testing
 */
export class NoOpProvider implements CacheProvider {
  readonly name = 'noop';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set<T>(_key: string, _value: T, _ttl?: number): Promise<void> {
    // No-op
  }

  async delete(_key: string): Promise<boolean> {
    return false;
  }

  async exists(_key: string): Promise<boolean> {
    return false;
  }

  async deletePattern(_pattern: string): Promise<number> {
    return 0;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return keys.map(() => null);
  }

  async mset<T>(_entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    // No-op
  }

  async ttl(_key: string): Promise<number> {
    return -1;
  }

  async close(): Promise<void> {
    // No-op
  }
}
