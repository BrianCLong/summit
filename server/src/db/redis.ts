// @ts-nocheck
import Redis, { Cluster } from 'ioredis';
import * as dotenv from 'dotenv';
import pino from 'pino';
import { telemetry } from '../lib/telemetry/comprehensive-telemetry.js';

dotenv.config();

const logger = (pino as any)({ name: 'RedisClient' });

// Map to store multiple Redis clients
const clients = new Map<string, Redis | Cluster | any>();

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  useCluster: boolean;
  clusterNodes: string;
  tlsEnabled: boolean;
  db?: number;
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
  const db = parseInt(getVar('DB') || '0', 10);
  let password = getVar('PASSWORD');

  if (
    process.env.NODE_ENV === 'production' &&
    (!password || password === 'devpassword')
  ) {
    logger.warn(
      `Security Warning: REDIS_PASSWORD (for ${name}) is not set or is "devpassword" in production`,
    );
  }

  return {
    host,
    port,
    password: password || 'devpassword',
    useCluster,
    clusterNodes,
    tlsEnabled,
    db
  };
}

export function getRedisClient(name: string = 'default'): Redis | Cluster {
  if (!clients.has(name)) {
    try {
      const config = getConfig(name);
      let client: Redis | Cluster;

      const commonOptions = {
        password: config.password,
        tls: config.tlsEnabled ? {} : undefined,
        connectTimeout: 10000, // 10s
        maxRetriesPerRequest: 3,
        enableOfflineQueue: true,
        retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        reconnectOnError: (err: Error) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
                return true;
            }
            return false;
        }
      };

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
          redisOptions: commonOptions,
          scaleReads: 'slave',
          clusterRetryStrategy: (times) => {
            const delay = Math.min(times * 100, 3000);
            return delay;
          },
          enableOfflineQueue: true,
          slotsRefreshTimeout: 2000,
        });
      } else {
        logger.info({ host: config.host, port: config.port, db: config.db, name }, 'Initializing Redis Client');
        client = new Redis({
          ...commonOptions,
          host: config.host,
          port: config.port,
          db: config.db,
          lazyConnect: true,
        });
      }

      client.on('connect', () => logger.info(`Redis client '${name}' connected.`));
      client.on('ready', () => logger.info(`Redis client '${name}' is ready.`));
      client.on('reconnecting', () => logger.warn(`Redis client '${name}' is reconnecting...`));
      client.on('error', (err: any) => {
        logger.error(
          `Redis connection '${name}' error: ${err.message}`,
        );
      });

      // Attach Telemetry
      const originalGet = client.get.bind(client);
      client.get = async (key: string) => {
        const start = Date.now();
        try {
            const value = await originalGet(key);
            if (value) {
                telemetry?.subsystems?.cache?.hits?.add(1);
            } else {
                telemetry?.subsystems?.cache?.misses?.add(1);
            }
            return value;
        } finally {
            // Optional: record duration
        }
      };

      const originalSet = client.set.bind(client);
      client.set = async (key: string, value: string, ...args: any[]) => {
        telemetry?.subsystems?.cache?.sets?.add(1);
        return await originalSet(key, value, ...args);
      };

      const originalDel = client.del.bind(client);
      client.del = (async (...keys: string[]) => {
        telemetry?.subsystems?.cache?.dels?.add(1);
        return await originalDel(...keys);
      }) as any;

      clients.set(name, client);

    } catch (error: any) {
      logger.warn(
        `Redis initialization for '${name}' failed - using mock mode. Error: ${(error as Error).message}`,
      );
      clients.set(name, createMockRedisClient(name));
    }
  }
  return clients.get(name);
}

function createMockRedisClient(name: string) {
  logger.warn(`Creating Mock Redis Client for ${name}`);
  const store = new Map<string, string>();
  return {
    get: async (key: string) => {
      logger.debug(`Mock Redis (${name}) GET: Key: ${key}`);
      return store.get(key) || null;
    },
    set: async (key: string, value: string, ...args: any[]) => {
      logger.debug(`Mock Redis (${name}) SET: Key: ${key}, Value: ${value}`);
      store.set(key, value);
      return 'OK';
    },
    del: async (...keys: string[]) => {
      logger.debug(`Mock Redis (${name}) DEL: Keys: ${keys.join(', ')}`);
      let count = 0;
      for (const key of keys) {
          if (store.delete(key)) count++;
      }
      return count;
    },
    exists: async (...keys: string[]) => {
      logger.debug(`Mock Redis (${name}) EXISTS: Keys: ${keys.join(', ')}`);
      let count = 0;
      for (const key of keys) {
          if (store.has(key)) count++;
      }
      return count;
    },
    expire: async (key: string, seconds: number) => {
      logger.debug(`Mock Redis (${name}) EXPIRE: Key: ${key}, Seconds: ${seconds}`);
      // Mock expiration strictly speaking needs a timeout, but for simple mocks we might skip it or implement properly
      return 1;
    },
    hgetall: async (key: string) => {
        // Simple mock for hgetall if needed, but 'store' is flat.
        return {};
    },
    keys: async (pattern: string) => {
        return Array.from(store.keys());
    },
    pipeline: () => ({
        exec: async () => [],
        get: () => {},
        set: () => {},
        del: () => {},
        expire: () => {}
    }),
    scanStream: () => {
        // Return empty stream or simple iterator
        const { Readable } = require('stream');
        return Readable.from([]);
    },
    quit: async () => { },
    on: () => { },
    connect: async () => { },
    options: { keyPrefix: 'summit:' },
    duplicate: () => createMockRedisClient(name),
    status: 'ready'
  };
}

export async function redisHealthCheck(): Promise<boolean> {
  // Check default client at least
  const defaultClient = clients.get('default');
  if (!defaultClient) return false;
  try {
    if ((defaultClient as any).status === 'ready' || (defaultClient as any).status === 'connect') {
        await defaultClient.ping();
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
