import Redis, { Cluster, type ClusterNode, type ClusterOptions, type RedisOptions } from 'ioredis';
import config from '../config/index.js';
import { logger } from '../config/logger.js';
import { type RedisClientInterface } from './AdvancedCachingStrategy.js';

type RedisLike = Redis | Cluster;

export class RedisService implements RedisClientInterface {
  private client: RedisLike;
  private subscriber: RedisLike;

  private static instance: RedisService;

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  constructor() {
    const redisConfig = config.redis || {};
    const useCluster = redisConfig.useCluster;
    const password = redisConfig.password;
    const tls = redisConfig.tls ? {} : undefined;

    // Common options for robustness
    const commonOptions: RedisOptions = {
      password: password,
      connectTimeout: 10000, // 10s
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      tls: tls,
      lazyConnect: true // Don't connect immediately in constructor
    };

    if (useCluster) {
      const nodes: ClusterNode[] = (redisConfig.clusterNodes || []).map((n: any) => ({
        host: n.host,
        port: n.port
      }));

      if (nodes.length === 0) {
        // Fallback to main host if no cluster nodes specified but useCluster is true
        nodes.push({
          host: redisConfig.host || 'localhost',
          port: redisConfig.port || 6379
        });
      }

      const clusterOptions: ClusterOptions = {
        redisOptions: commonOptions,
        dnsLookup: (address, callback) => callback(null, address),
        scaleReads: 'slave', // Read from slaves if possible
      };

      logger.info({ nodes }, 'Initializing Redis Cluster');
      this.client = new Cluster(nodes, clusterOptions);
      this.subscriber = new Cluster(nodes, clusterOptions);
    } else {
      const host = redisConfig.host || 'localhost';
      const port = redisConfig.port || 6379;
      const db = redisConfig.db || 0;

      logger.info({ host, port, db }, 'Initializing Redis Standalone');
      this.client = new Redis({
        ...commonOptions,
        host,
        port,
        db
      });
      this.subscriber = new Redis({
        ...commonOptions,
        host,
        port,
        db
      });
    }

    // Error handling
    this.handleErrors(this.client, 'Client');
    this.handleErrors(this.subscriber, 'Subscriber');
  }

  private handleErrors(client: RedisLike, name: string) {
    client.on('error', (err) => {
      logger.error({ err, client: name }, 'Redis connection error');
    });
    client.on('connect', () => {
      logger.info({ client: name }, 'Redis connected');
    });
  }

  /**
   * Returns the underlying ioredis client (command client)
   */
  getClient(): RedisLike {
    return this.client;
  }

  /**
   * Returns the underlying ioredis subscriber client
   */
  getSubscriber(): RedisLike {
    return this.subscriber;
  }

  // Implementation of RedisClientInterface

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string | null> {
    if (mode && duration) {
      // ioredis supports set(key, value, mode, duration)
      // but strict types might require casting or specific overload
      return this.client.set(key, value, mode as any, duration);
    }
    return this.client.set(key, value);
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    return this.client.setex(key, seconds, value);
  }

  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return this.client.mget(...keys);
  }

  async mset(...keyValues: string[]): Promise<string> {
    // ioredis mset takes object or array of k,v.
    // keys is ["k1", "v1", "k2", "v2"] ?
    // The interface says ...keyValues: string[].
    // ioredis expects a map or array.
    // If keyValues is ["k1", "v1"], ioredis supports Map.
    // If ...keyValues spread is used, ioredis supports arguments?
    // Let's assume input matches ioredis signature if possible.
    // Wait, RedisClientInterface: mset(...keyValues: string[]): Promise<string>;
    // If it's rest args, it is likely key, value, key, value.
    // ioredis mset(key: string, value: string | number, ...args: (string | number)[]): Promise<"OK">;
    // So if keyValues is non-empty:
    if (keyValues.length === 0) return 'OK';
    // ioredis signature: mset(data: Record<string, string | number | Buffer>): Promise<"OK">;
    // OR mset(key, val, ...)
    // But Cluster mset might differ.
    // Safest is to pass object or Map.
    // But we receive array.
    const map = new Map<string, string>();
    for (let i = 0; i < keyValues.length; i += 2) {
      map.set(keyValues[i], keyValues[i + 1]);
    }
    return this.client.mset(map);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async scan(cursor: string, ...args: string[]): Promise<[string, string[]]> {
    return this.client.scan(cursor, ...args);
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  async subscribe(channel: string): Promise<void> {
    await this.subscriber.subscribe(channel);
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (event === 'message') {
      this.subscriber.on(event, callback);
    } else {
      this.client.on(event, callback);
    }
  }

  pipeline(): any {
    return this.client.pipeline();
  }

  async quit(): Promise<string> {
    await Promise.all([this.client.quit(), this.subscriber.quit()]);
    return 'OK';
  }

  // Additional helper methods

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.client.hincrby(key, field, increment);
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.client.hdel(key, field);
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async close(): Promise<void> {
    await this.quit();
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }
}
