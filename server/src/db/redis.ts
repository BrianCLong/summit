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
          maxRetriesPerRequest: 3,
        });
      }

      client.on('connect', () => logger.info(`Redis client '${name}' connected.`));
      client.on('error', (err: any) => {
        logger.warn(
          `Redis connection '${name}' failed - using mock responses. Error: ${err.message}`,
        );
        // Replace the failed client in the map with a mock
        // Note: This replaces the reference for future calls, but existing references might be broken?
        // Actually, we usually just return the mock here.
        // But since we are assigning to 'client' which is local, we need to update the map?
        // The pattern in the original code was: redisClient = createMock...
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
      client.set = async (key: string, value: string) => {
        telemetry.subsystems.cache.sets.add(1);
        return await originalSet(key, value);
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
    quit: async () => { },
    on: () => { },
    connect: async () => { },
    options: { keyPrefix: 'summit:' },
    duplicate: () => createMockRedisClient(name),
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
