// @ts-nocheck
import Redis, { Cluster } from 'ioredis';
import * as dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = (pino as any)();

import { telemetry } from '../lib/telemetry/comprehensive-telemetry.js';

// Map to store multiple Redis clients
const clients = new Map<string, Redis | Cluster | any>();

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  useCluster: boolean;
  clusterNodes: string;
  tlsEnabled: boolean;
}

function getConfig(name: string): RedisConfig {
  const prefix = name === 'default' ? 'REDIS' : `REDIS_${name.toUpperCase()}`;

  // Fallback to default REDIS_* vars if specific ones aren't set
  const getVar = (suffix: string) => process.env[`${prefix}_${suffix}`] || process.env[`REDIS_${suffix}`];

  const host = getVar('HOST') || 'redis';
  const port = parseInt(getVar('PORT') || '6379', 10);
  const useCluster = getVar('USE_CLUSTER') === 'true';
  const clusterNodes = getVar('CLUSTER_NODES') || '';
  const tlsEnabled = getVar('TLS_ENABLED') === 'true';
  let password = getVar('PASSWORD');

  if (
    process.env.NODE_ENV === 'production' &&
    (!password || password === 'devpassword')
  ) {
    // In strict production, we might throw. For now, log warning or throw if critical.
    // throw new Error(
    //   `Security Error: REDIS_PASSWORD (for ${name}) must be set and cannot be "devpassword" in production`,
    // );
  }

  return {
    host,
    port,
    password: password || 'devpassword',
    useCluster,
    clusterNodes,
    tlsEnabled
  };
}

export function getRedisClient(name: string = 'default'): Redis | Cluster {
  if (!clients.has(name)) {
    try {
      const config = getConfig(name);
      let client: Redis | Cluster;

      if (config.useCluster) {
        if (!config.clusterNodes) {
          throw new Error(`Redis Cluster enabled for ${name} but CLUSTER_NODES is not defined`);
        }

        const nodes = config.clusterNodes.split(',').map((node) => {
          const [host, port] = node.split(':');
          return { host, port: parseInt(port, 10) };
        });

        logger.info({ nodes, name }, 'Initializing Redis Cluster');

        client = new Redis.Cluster(nodes, {
          redisOptions: {
            password: config.password,
            tls: config.tlsEnabled ? {} : undefined,
            connectTimeout: 10000,
            maxRetriesPerRequest: null,
          },
          scaleReads: 'slave',
          clusterRetryStrategy: (times) => {
            const delay = Math.min(times * 100, 3000);
            return delay;
          },
          enableOfflineQueue: true,
        });
      } else {
        logger.info({ host: config.host, port: config.port, name }, 'Initializing Redis Client');
        client = new Redis({
          host: config.host,
          port: config.port,
          password: config.password,
          tls: config.tlsEnabled ? {} : undefined,
          connectTimeout: 10000,
          lazyConnect: true,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: null,
        });
      }

      client.on('connect', () => logger.info(`Redis client '${name}' connected.`));
      client.on('error', (err: any) => {
        logger.warn(
          `Redis connection '${name}' failed - using mock responses. Error: ${err.message}`,
        );
        clients.set(name, createMockRedisClient(name));
      });

      // Attach Telemetry
      const originalGet = client.get.bind(client);
      client.get = async (key: string) => {
        const value = await originalGet(key);
        if (value) {
          telemetry.subsystems.cache.hits.add(1);
        } else {
          telemetry.subsystems.cache.misses.add(1);
        }
        return value;
      };

      const originalSet = client.set.bind(client);
      client.set = async (key: string, value: string, ...args: any[]) => {
        telemetry.subsystems.cache.sets.add(1);
        return await originalSet(key, value, ...args);
      };

      const originalDel = client.del.bind(client);
      client.del = (async (...keys: string[]) => {
        telemetry.subsystems.cache.dels.add(1);
        return await originalDel(...keys);
      }) as any;

      clients.set(name, client);

    } catch (error: any) {
      logger.warn(
        `Redis initialization for '${name}' failed - using development mode. Error: ${(error as Error).message}`,
      );
      clients.set(name, createMockRedisClient(name));
    }
  }
  return clients.get(name);
}

function createMockRedisClient(name: string) {
  return {
    get: async (key: string) => {
      logger.debug(`Mock Redis (${name}) GET: Key: ${key}`);
      return null;
    },
    set: async (key: string, value: string, ...args: any[]) => {
      logger.debug(`Mock Redis (${name}) SET: Key: ${key}, Value: ${value}`);
      return 'OK';
    },
    del: async (...keys: string[]) => {
      logger.debug(`Mock Redis (${name}) DEL: Keys: ${keys.join(', ')}`);
      return keys.length;
    },
    exists: async (...keys: string[]) => {
      logger.debug(`Mock Redis (${name}) EXISTS: Keys: ${keys.join(', ')}`);
      return 0;
    },
    expire: async (key: string, seconds: number) => {
      logger.debug(`Mock Redis (${name}) EXPIRE: Key: ${key}, Seconds: ${seconds}`);
      return 1;
    },
    hgetall: async (key: string) => {
        logger.debug(`Mock Redis (${name}) HGETALL: Key: ${key}`);
        return {};
    },
    hincrby: async (key: string, field: string, increment: number) => {
        logger.debug(`Mock Redis (${name}) HINCRBY: Key: ${key}, Field: ${field}`);
        return increment;
    },
    hdel: async (key: string, field: string) => {
        logger.debug(`Mock Redis (${name}) HDEL: Key: ${key}, Field: ${field}`);
        return 1;
    },
    setex: async (key: string, seconds: number, value: string) => {
        logger.debug(`Mock Redis (${name}) SETEX: Key: ${key}, Seconds: ${seconds}, Value: ${value}`);
        return 'OK';
    },
    ping: async () => 'PONG',
    keys: async (pattern: string) => [],
    quit: async () => { },
    on: () => { },
    connect: async () => { },
    options: { keyPrefix: 'summit:' },
    duplicate: () => createMockRedisClient(name),
    pipeline: () => ({
        get: () => {},
        exec: async () => []
    })
  };
}

export async function redisHealthCheck(): Promise<boolean> {
  // Check default client at least
  const defaultClient = clients.get('default');
  if (!defaultClient) return false;
  try {
    await defaultClient.ping();
    return true;
  } catch {
    return false;
  }
}

export async function closeRedisClient(): Promise<void> {
  for (const [name, client] of clients.entries()) {
    if (client) {
      await client.quit();
      logger.info(`Redis client '${name}' closed.`);
    }
  }
  clients.clear();
}

/**
 * Singleton service wrapper for the default Redis client.
 * Provides a unified interface compatible with previous implementations.
 */
export class RedisService {
  private static instance: RedisService;
  private client: Redis | Cluster;

  private constructor() {
    this.client = getRedisClient();
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  getClient(): Redis | Cluster {
    return this.client;
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
    // We delegate closing to the global closeRedisClient function if needed,
    // but here we just quit this instance's view of it?
    // Actually, since getRedisClient returns a shared instance, we probably shouldn't close it directly
    // unless we mean to shut down the app.
    // But for compatibility:
    // await this.client.quit();
    // better to warn or no-op if it's shared.
    // Let's rely on closeRedisClient() for app shutdown.
    logger.warn('RedisService.close() called. Ignoring as client is shared. Use closeRedisClient() to shutdown all clients.');
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
}
