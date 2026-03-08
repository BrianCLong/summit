import Redis from 'ioredis';
import pino from 'pino';
import { StateBackend, StateDescriptor } from './types';

const logger = pino({ name: 'state-manager' });

/**
 * State manager for stateful stream operations
 */
export class StateManager {
  private backend: StateBackend = StateBackend.MEMORY;
  private memoryStore: Map<string, any> = new Map();
  private redis: Redis | null = null;
  private ttlTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(backend?: StateBackend, redisUrl?: string) {
    if (backend) {
      this.backend = backend;
    }

    if (backend === StateBackend.REDIS && redisUrl) {
      this.redis = new Redis(redisUrl);
      logger.info('Redis state backend initialized');
    }
  }

  /**
   * Get state value
   */
  async get<T>(descriptor: StateDescriptor<T>, key: string): Promise<T | undefined> {
    const stateKey = this.buildKey(descriptor.name, key);

    switch (this.backend) {
      case StateBackend.MEMORY:
        return this.memoryStore.get(stateKey) ?? descriptor.defaultValue;

      case StateBackend.REDIS:
        if (!this.redis) {
          throw new Error('Redis not initialized');
        }

        const value = await this.redis.get(stateKey);
        if (value === null) {
          return descriptor.defaultValue;
        }

        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }

      default:
        throw new Error(`Unsupported state backend: ${this.backend}`);
    }
  }

  /**
   * Update state value
   */
  async update<T>(
    descriptor: StateDescriptor<T>,
    key: string,
    value: T
  ): Promise<void> {
    const stateKey = this.buildKey(descriptor.name, key);

    switch (this.backend) {
      case StateBackend.MEMORY:
        this.memoryStore.set(stateKey, value);

        // Set TTL timer if specified
        if (descriptor.ttl) {
          this.setTTL(stateKey, descriptor.ttl);
        }
        break;

      case StateBackend.REDIS:
        if (!this.redis) {
          throw new Error('Redis not initialized');
        }

        const serialized = typeof value === 'string' ? value : JSON.stringify(value);

        if (descriptor.ttl) {
          await this.redis.setex(stateKey, Math.floor(descriptor.ttl / 1000), serialized);
        } else {
          await this.redis.set(stateKey, serialized);
        }
        break;

      default:
        throw new Error(`Unsupported state backend: ${this.backend}`);
    }

    logger.debug({ key: stateKey }, 'State updated');
  }

  /**
   * Delete state
   */
  async delete(descriptor: StateDescriptor, key: string): Promise<void> {
    const stateKey = this.buildKey(descriptor.name, key);

    switch (this.backend) {
      case StateBackend.MEMORY:
        this.memoryStore.delete(stateKey);
        this.clearTTL(stateKey);
        break;

      case StateBackend.REDIS:
        if (!this.redis) {
          throw new Error('Redis not initialized');
        }
        await this.redis.del(stateKey);
        break;

      default:
        throw new Error(`Unsupported state backend: ${this.backend}`);
    }

    logger.debug({ key: stateKey }, 'State deleted');
  }

  /**
   * Clear all state
   */
  async clear(descriptorName: string): Promise<void> {
    switch (this.backend) {
      case StateBackend.MEMORY:
        const prefix = `${descriptorName}:`;
        for (const key of this.memoryStore.keys()) {
          if (key.startsWith(prefix)) {
            this.memoryStore.delete(key);
            this.clearTTL(key);
          }
        }
        break;

      case StateBackend.REDIS:
        if (!this.redis) {
          throw new Error('Redis not initialized');
        }

        const pattern = `${descriptorName}:*`;
        const keys = await this.redis.keys(pattern);

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        break;

      default:
        throw new Error(`Unsupported state backend: ${this.backend}`);
    }

    logger.info({ descriptorName }, 'State cleared');
  }

  /**
   * Build state key
   */
  private buildKey(descriptorName: string, key: string): string {
    return `${descriptorName}:${key}`;
  }

  /**
   * Set TTL for in-memory state
   */
  private setTTL(key: string, ttl: number): void {
    // Clear existing timer
    this.clearTTL(key);

    // Set new timer
    const timer = setTimeout(() => {
      this.memoryStore.delete(key);
      this.ttlTimers.delete(key);
      logger.debug({ key }, 'State expired');
    }, ttl);

    this.ttlTimers.set(key, timer);
  }

  /**
   * Clear TTL timer
   */
  private clearTTL(key: string): void {
    const timer = this.ttlTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.ttlTimers.delete(key);
    }
  }

  /**
   * Disconnect from backend
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }

    // Clear all TTL timers
    for (const timer of this.ttlTimers.values()) {
      clearTimeout(timer);
    }
    this.ttlTimers.clear();

    logger.info('State manager disconnected');
  }
}

/**
 * Value state for storing single values
 */
export class ValueState<T> {
  constructor(
    private stateManager: StateManager,
    private descriptor: StateDescriptor<T>,
    private key: string
  ) {}

  async value(): Promise<T | undefined> {
    return this.stateManager.get(this.descriptor, this.key);
  }

  async update(value: T): Promise<void> {
    await this.stateManager.update(this.descriptor, this.key, value);
  }

  async clear(): Promise<void> {
    await this.stateManager.delete(this.descriptor, this.key);
  }
}

/**
 * List state for storing lists
 */
export class ListState<T> {
  constructor(
    private stateManager: StateManager,
    private descriptor: StateDescriptor<T[]>,
    private key: string
  ) {}

  async get(): Promise<T[]> {
    const value = await this.stateManager.get(this.descriptor, this.key);
    return value || [];
  }

  async add(value: T): Promise<void> {
    const list = await this.get();
    list.push(value);
    await this.stateManager.update(this.descriptor, this.key, list);
  }

  async addAll(values: T[]): Promise<void> {
    const list = await this.get();
    list.push(...values);
    await this.stateManager.update(this.descriptor, this.key, list);
  }

  async clear(): Promise<void> {
    await this.stateManager.delete(this.descriptor, this.key);
  }
}

/**
 * Map state for storing key-value pairs
 */
export class MapState<K, V> {
  constructor(
    private stateManager: StateManager,
    private descriptor: StateDescriptor<Map<K, V>>,
    private key: string
  ) {}

  async get(mapKey: K): Promise<V | undefined> {
    const map = await this.getAll();
    return map.get(mapKey);
  }

  async put(mapKey: K, value: V): Promise<void> {
    const map = await this.getAll();
    map.set(mapKey, value);
    await this.stateManager.update(this.descriptor, this.key, map);
  }

  async getAll(): Promise<Map<K, V>> {
    const value = await this.stateManager.get(this.descriptor, this.key);
    return value || new Map();
  }

  async remove(mapKey: K): Promise<void> {
    const map = await this.getAll();
    map.delete(mapKey);
    await this.stateManager.update(this.descriptor, this.key, map);
  }

  async clear(): Promise<void> {
    await this.stateManager.delete(this.descriptor, this.key);
  }
}
