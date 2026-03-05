import Redis, { Cluster } from 'ioredis';
import type { CacheProvider } from '../types.js';

/**
 * Redis provider options
 */
export interface RedisProviderOptions {
  /** Redis URL (takes precedence) */
  url?: string;
  /** Host */
  host?: string;
  /** Port */
  port?: number;
  /** Password */
  password?: string;
  /** Database number */
  db?: number;
  /** Key prefix */
  keyPrefix?: string;
  /** Max retries per request */
  maxRetriesPerRequest?: number;
  /** Connection timeout in ms */
  connectTimeout?: number;
  /** Enable offline queue */
  enableOfflineQueue?: boolean;
  /** Use Redis Cluster */
  useCluster?: boolean;
  /** TLS options (pass empty object to enable TLS) */
  tls?: Record<string, any>;
  /** Array of Redis nodes (URLs) for partitioning */
  nodes?: string[];
  /** Partitioning strategy */
  partitionStrategy?: 'hash' | 'ring';
}

/**
 * Redis cache provider
 */
export class RedisProvider implements CacheProvider {
  readonly name = 'redis';
  private client: Redis | Cluster | Redis[];
  private keyPrefix: string;
  private partitionStrategy: 'hash' | 'ring';
  private ring: Map<number, number> = new Map();

  constructor(options: RedisProviderOptions = {}) {
    this.keyPrefix = options.keyPrefix ?? '';

    const commonOptions: any = {
      maxRetriesPerRequest: options.maxRetriesPerRequest ?? 3,
      connectTimeout: options.connectTimeout ?? 10000,
      enableOfflineQueue: options.enableOfflineQueue ?? true,
      lazyConnect: true,
      password: options.password,
    };

    if (options.tls) {
      commonOptions.tls = options.tls;
    }

    this.partitionStrategy = options.partitionStrategy ?? 'hash';

    if (options.nodes && options.nodes.length > 0) {
      // Use array of Redis clients for partitioning
      this.client = options.nodes.map(url => new Redis(url, commonOptions));

      // Initialize ring for consistent hashing if selected
      if (this.partitionStrategy === 'ring') {
        this.initializeRing(options.nodes.length);
      }

      // Handle errors for all clients
      for (const client of this.client) {
        client.on('error', (err) => {
          console.error('Redis partitioned client error:', err.message);
        });
      }
    } else if (options.useCluster) {
      // For cluster mode, we can pass the URL or host/port as a startup node
      const startupNode = options.url || {
        host: options.host ?? 'localhost',
        port: options.port ?? 6379,
      };

      this.client = new Redis.Cluster([startupNode], {
        redisOptions: commonOptions,
        dnsLookup: (address, callback) => callback(null, address), // Often needed for AWS ElastiCache
      });
      this.client.on('error', (err) => {
        console.error('Redis error:', err.message);
      });
    } else if (options.url) {
      this.client = new Redis(options.url, commonOptions);
      this.client.on('error', (err) => {
        console.error('Redis error:', err.message);
      });
    } else {
      this.client = new Redis({
        host: options.host ?? 'localhost',
        port: options.port ?? 6379,
        db: options.db ?? 0,
        ...commonOptions,
      });
      this.client.on('error', (err) => {
        console.error('Redis error:', err.message);
      });
    }
  }

  private initializeRing(nodeCount: number): void {
    const replicas = 100;
    for (let node = 0; node < nodeCount; node++) {
      for (let i = 0; i < replicas; i++) {
        const hash = this.hashString(`${node}-${i}`);
        this.ring.set(hash, node);
      }
    }
    // Sort keys for binary search, but since Map iterates in insertion order,
    // it's better to store an array of sorted keys if we need high performance
    this.ringKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  private ringKeys: number[] = [];

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit int
    }
    return hash;
  }

  private getClientForKey(key: string): Redis | Cluster {
    if (!Array.isArray(this.client)) {
      return this.client;
    }

    if (this.client.length === 1) {
      return this.client[0];
    }

    if (this.partitionStrategy === 'ring') {
      const hash = this.hashString(key);

      // Binary search for the first key >= hash
      let left = 0;
      let right = this.ringKeys.length - 1;
      let idx = 0; // Default to first if hash > all keys (wrap around)

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (this.ringKeys[mid] >= hash) {
          idx = mid;
          right = mid - 1;
        } else {
          left = mid + 1;
        }
      }

      const nodeIdx = this.ring.get(this.ringKeys[idx]) as number;
      return this.client[nodeIdx];
    }

    // Default: simple hash partitioning
    const hash = this.hashString(key);
    const index = Math.abs(hash) % this.client.length;
    return this.client[index];
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (Array.isArray(this.client)) {
        // Ping all nodes
        await Promise.all(this.client.map(c => c.ping()));
        return true;
      }
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const client = this.getClientForKey(key);
    const value = await client.get(this.prefixKey(key));
    if (value === null) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const prefixedKey = this.prefixKey(key);
    const client = this.getClientForKey(key);

    if (ttl !== undefined && ttl > 0) {
      await client.setex(prefixedKey, ttl, serialized);
    } else {
      await client.set(prefixedKey, serialized);
    }
  }

  async delete(key: string): Promise<boolean> {
    const client = this.getClientForKey(key);
    const result = await client.del(this.prefixKey(key));
    return result > 0;
  }

  async exists(key: string): Promise<boolean> {
    const client = this.getClientForKey(key);
    const result = await client.exists(this.prefixKey(key));
    return result > 0;
  }

  async deletePattern(pattern: string): Promise<number> {
    const prefixedPattern = this.prefixKey(pattern);

    if (Array.isArray(this.client)) {
      // Must query all nodes for a pattern
      let totalCount = 0;
      for (const client of this.client) {
        let cursor = '0';
        do {
          const [newCursor, keys] = await client.scan(
            cursor,
            'MATCH',
            prefixedPattern,
            'COUNT',
            100
          );
          cursor = newCursor;

          if (keys.length > 0) {
            const deleted = await client.del(...keys);
            totalCount += deleted;
          }
        } while (cursor !== '0');
      }
      return totalCount;
    }

    let cursor = '0';
    let count = 0;

    do {
      const [newCursor, keys] = await (this.client as Redis | Cluster).scan(
        cursor,
        'MATCH',
        prefixedPattern,
        'COUNT',
        100
      );
      cursor = newCursor;

      if (keys.length > 0) {
        const deleted = await (this.client as Redis | Cluster).del(...keys);
        count += deleted;
      }
    } while (cursor !== '0');

    return count;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) {
      return [];
    }

    if (Array.isArray(this.client)) {
      // Group keys by node
      const keysByNode = new Map<Redis, { originalIndex: number; key: string }[]>();

      keys.forEach((key, i) => {
        const client = this.getClientForKey(key) as Redis;
        if (!keysByNode.has(client)) {
          keysByNode.set(client, []);
        }
        keysByNode.get(client)!.push({ originalIndex: i, key: this.prefixKey(key) });
      });

      const result: (T | null)[] = new Array(keys.length).fill(null);

      // Fetch from each node in parallel
      const fetchPromises = Array.from(keysByNode.entries()).map(async ([client, nodeKeys]) => {
        const prefixedKeys = nodeKeys.map(k => k.key);
        const values = await client.mget(...prefixedKeys);

        values.forEach((v, i) => {
          const originalIndex = nodeKeys[i].originalIndex;
          if (v !== null) {
            try {
              result[originalIndex] = JSON.parse(v) as T;
            } catch {
              result[originalIndex] = null;
            }
          }
        });
      });

      await Promise.all(fetchPromises);
      return result;
    }

    const prefixedKeys = keys.map(k => this.prefixKey(k));
    const values = await (this.client as Redis | Cluster).mget(...prefixedKeys);

    return values.map(v => {
      if (v === null) return null;
      try {
        return JSON.parse(v) as T;
      } catch {
        return null;
      }
    });
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    if (Array.isArray(this.client)) {
      // Group entries by node
      const entriesByNode = new Map<Redis, typeof entries>();

      for (const entry of entries) {
        const client = this.getClientForKey(entry.key) as Redis;
        if (!entriesByNode.has(client)) {
          entriesByNode.set(client, []);
        }
        entriesByNode.get(client)!.push(entry);
      }

      // Execute pipelines on each node in parallel
      const pipelinePromises = Array.from(entriesByNode.entries()).map(async ([client, nodeEntries]) => {
        const pipeline = client.pipeline();
        for (const entry of nodeEntries) {
          const prefixedKey = this.prefixKey(entry.key);
          const serialized = JSON.stringify(entry.value);

          if (entry.ttl !== undefined && entry.ttl > 0) {
            pipeline.setex(prefixedKey, entry.ttl, serialized);
          } else {
            pipeline.set(prefixedKey, serialized);
          }
        }
        await pipeline.exec();
      });

      await Promise.all(pipelinePromises);
      return;
    }

    const pipeline = (this.client as Redis | Cluster).pipeline();

    for (const entry of entries) {
      const prefixedKey = this.prefixKey(entry.key);
      const serialized = JSON.stringify(entry.value);

      if (entry.ttl !== undefined && entry.ttl > 0) {
        pipeline.setex(prefixedKey, entry.ttl, serialized);
      } else {
        pipeline.set(prefixedKey, serialized);
      }
    }

    await pipeline.exec();
  }

  async ttl(key: string): Promise<number> {
    const client = this.getClientForKey(key);
    return client.ttl(this.prefixKey(key));
  }

  /**
   * Backup all keys from the cache.
   * Returns a JSON string containing keys, values, and TTLs.
   * Note: This uses SCAN so it won't block Redis, but could be slow for very large datasets.
   */
  async backup(): Promise<string> {
    const backupData: Record<string, { value: any; ttl: number }> = {};
    const clients = Array.isArray(this.client) ? this.client : [this.client as Redis | Cluster];

    for (const client of clients) {
      let cursor = '0';
      do {
        const [newCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          this.keyPrefix ? `${this.keyPrefix}*` : '*',
          'COUNT',
          1000
        );
        cursor = newCursor;

        if (keys.length > 0) {
          // Fetch values and TTLs in pipeline for better performance
          const pipeline = client.pipeline();
          for (const key of keys) {
            pipeline.get(key);
            pipeline.ttl(key);
          }

          const results = await pipeline.exec();
          if (results) {
            for (let i = 0; i < keys.length; i++) {
              const getValueResult = results[i * 2];
              const getTtlResult = results[i * 2 + 1];

              // Only keep successfully fetched keys
              if (!getValueResult[0] && !getTtlResult[0] && getValueResult[1] !== null) {
                const key = this.keyPrefix ? keys[i].substring(this.keyPrefix.length) : keys[i];
                let value;
                try {
                  value = JSON.parse(getValueResult[1] as string);
                } catch {
                  // Fallback for non-JSON values if any existed
                  value = getValueResult[1];
                }

                backupData[key] = {
                  value,
                  ttl: getTtlResult[1] as number
                };
              }
            }
          }
        }
      } while (cursor !== '0');
    }

    return JSON.stringify(backupData);
  }

  /**
   * Restore cache from backup string.
   */
  async restore(backupStr: string): Promise<void> {
    try {
      const backupData = JSON.parse(backupStr) as Record<string, { value: any; ttl: number }>;

      const entries: Array<{ key: string; value: any; ttl?: number }> = [];
      for (const [key, data] of Object.entries(backupData)) {
        entries.push({
          key,
          value: data.value,
          ttl: data.ttl > 0 ? data.ttl : undefined
        });
      }

      // We can use the existing mset method which handles partitioning appropriately
      await this.mset(entries);
    } catch (error) {
      console.error('Failed to restore Redis backup:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (Array.isArray(this.client)) {
      await Promise.all(this.client.map(c => c.quit()));
    } else {
      await this.client.quit();
    }
  }

  /**
   * Get underlying Redis client(s)
   */
  getClient(): Redis | Cluster | Redis[] {
    return this.client;
  }

  /**
   * Add prefix to key
   */
  private prefixKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}${key}` : key;
  }
}
