import Redis, { Cluster, type ClusterOptions, type RedisOptions } from 'ioredis';
import * as dotenv from 'dotenv';
import pino from 'pino';
import { telemetry } from '../lib/telemetry/comprehensive-telemetry.js';

dotenv.config();

const logger = (pino as any)();

// Type alias for our Redis client
export type RedisClient = Redis | Cluster;

// Map to store multiple Redis clients
const clients = new Map<string, RedisClient | any>();

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
    throw new Error(
      `Security Error: REDIS_PASSWORD (for ${name}) must be set and cannot be "devpassword" in production`,
    );
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

export function getRedisClient(name: string = 'default'): RedisClient {
  if (!clients.has(name)) {
    try {
      const config = getConfig(name);
      let client: RedisClient;

      if (config.useCluster) {
        if (!config.clusterNodes) {
          throw new Error(`Redis Cluster enabled for ${name} but CLUSTER_NODES is not defined`);
        }

        const nodes = config.clusterNodes.split(',').map((node) => {
          const [host, port] = node.split(':');
          return { host, port: parseInt(port, 10) };
        });

        logger.info({ nodes, name }, 'Initializing Redis Cluster');

        const clusterOptions: ClusterOptions = {
          redisOptions: {
            password: config.password,
            tls: config.tlsEnabled ? {} : undefined,
            connectTimeout: 10000,
            maxRetriesPerRequest: null,
          },
          scaleReads: 'slave',
          clusterRetryStrategy: (times: number) => {
            const delay = Math.min(times * 100, 3000);
            return delay;
          },
          enableOfflineQueue: true,
        };

        client = new Redis.Cluster(nodes, clusterOptions);
      } else {
        logger.info({ host: config.host, port: config.port, name }, 'Initializing Redis Client');
        const redisOptions: RedisOptions = {
          host: config.host,
          port: config.port,
          password: config.password,
          tls: config.tlsEnabled ? {} : undefined,
          connectTimeout: 10000,
          lazyConnect: true,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: null,
        };
        client = new Redis(redisOptions);
      }

      client.on('connect', () => logger.info(`Redis client '${name}' connected.`));

      client.on('error', (err: any) => {
        logger.error(`Redis connection '${name}' error: ${err.message}`);

        // In production, we do NOT want to silently failover to a mock,
        // as this can lead to data inconsistency and confusing bugs.
        // We let the application crash or handle the error upstream.
        if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
             logger.warn(`Using mock Redis client for '${name}' due to connection error (non-production).`);
             clients.set(name, createMockRedisClient(name));
        }
      });

      // Attach Telemetry using Proxy to avoid mutating the client prototype directly if possible,
      // or just wrapping methods. Since ioredis methods are bound, we need to be careful.
      // Simpler approach: wrapping specific methods we care about.

      const originalGet = client.get.bind(client);
      // @ts-ignore
      client.get = async (key: Redis.KeyType) => {
        const value = await originalGet(key);
        if (value) {
          telemetry.subsystems.cache.hits.add(1);
        } else {
          telemetry.subsystems.cache.misses.add(1);
        }
        return value;
      };

      const originalSet = client.set.bind(client);
      // @ts-ignore
      client.set = async (key: Redis.KeyType, value: Redis.ValueType, ...args: any[]) => {
        telemetry.subsystems.cache.sets.add(1);
        // @ts-ignore
        return await originalSet(key, value, ...args);
      };

      const originalDel = client.del.bind(client);
      // @ts-ignore
      client.del = async (...keys: Redis.KeyType[]) => {
        telemetry.subsystems.cache.dels.add(1);
        return await originalDel(...keys);
      };

      clients.set(name, client);

    } catch (error: any) {
      if (process.env.NODE_ENV === 'production') {
        logger.fatal(`Redis initialization for '${name}' failed: ${(error as Error).message}`);
        throw error;
      }

      logger.warn(
        `Redis initialization for '${name}' failed - using development mode. Error: ${(error as Error).message}`,
      );
      clients.set(name, createMockRedisClient(name));
    }
  }
  return clients.get(name);
}

function createMockRedisClient(name: string): any {
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
    quit: async () => { },
    on: () => { },
    connect: async () => { },
    options: { keyPrefix: 'summit:' },
    duplicate: () => createMockRedisClient(name),
    status: 'ready',
  };
}

export async function redisHealthCheck(): Promise<boolean> {
  // Check default client at least
  const defaultClient = clients.get('default');
  if (!defaultClient) return false;
  try {
    if ((defaultClient as any).status === 'ready' || (defaultClient as any).status === 'connect') {
       if (typeof defaultClient.ping === 'function') {
           await defaultClient.ping();
           return true;
       }
       // Mock client might not have ping or it might just work
       return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function closeRedisClient(): Promise<void> {
  for (const [name, client] of clients.entries()) {
    if (client && typeof client.quit === 'function') {
      await client.quit();
      logger.info(`Redis client '${name}' closed.`);
    }
  }
  clients.clear();
}
