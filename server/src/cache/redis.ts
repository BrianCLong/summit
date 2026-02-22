import Redis, { Cluster, type ClusterNode, type ClusterOptions, type RedisOptions } from 'ioredis';
import config from '../config/index.js';
import { logger } from '../config/logger.js';

type RedisLike = Redis | Cluster;

export class RedisService {
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

  getClient(): RedisLike {
    return this.client;
  }

  getSubscriber(): RedisLike {
    return this.subscriber;
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hincrby(
    key: string,
    field: string,
    increment: number,
  ): Promise<number> {
    return this.client.hincrby(key, field, increment);
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.client.hdel(key, field);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.client.setex(key, seconds, value);
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async close(): Promise<void> {
    await Promise.all([this.client.quit(), this.subscriber.quit()]);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    if (ttlSeconds !== undefined) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  // Added methods for sets and other needs
  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async lpush(key: string, ...elements: string[]): Promise<number> {
    return this.client.lpush(key, ...elements);
  }

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    return this.client.ltrim(key, start, stop);
  }

  // Expose pipeline for batch operations
  pipeline() {
    return this.client.pipeline();
  }

  // Allow duplicate for dedicated subscribers
  duplicate(): RedisLike {
    return this.client.duplicate();
  }
}
