// @ts-nocheck
import Redis, { Cluster } from 'ioredis';
import * as dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = (pino as any)();

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_USE_CLUSTER = process.env.REDIS_USE_CLUSTER === 'true';
const REDIS_CLUSTER_NODES = process.env.REDIS_CLUSTER_NODES || '';
const REDIS_TLS_ENABLED = process.env.REDIS_TLS_ENABLED === 'true';

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.REDIS_PASSWORD || process.env.REDIS_PASSWORD === 'devpassword')
) {
  throw new Error(
    'Security Error: REDIS_PASSWORD must be set and cannot be "devpassword" in production',
  );
}
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'devpassword';

import { telemetry } from '../lib/telemetry/comprehensive-telemetry.js';

let redisClient: Redis | Cluster | any;

export function getRedisClient(): Redis | Cluster {
  if (!redisClient) {
    try {
      if (REDIS_USE_CLUSTER) {
        if (!REDIS_CLUSTER_NODES) {
          throw new Error('Redis Cluster enabled but REDIS_CLUSTER_NODES is not defined');
        }

        const nodes = REDIS_CLUSTER_NODES.split(',').map((node) => {
          const [host, port] = node.split(':');
          return { host, port: parseInt(port, 10) };
        });

        logger.info({ nodes }, 'Initializing Redis Cluster');

        redisClient = new Redis.Cluster(nodes, {
          redisOptions: {
            password: REDIS_PASSWORD,
            tls: REDIS_TLS_ENABLED ? {} : undefined,
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
        redisClient = new Redis({
          host: REDIS_HOST,
          port: REDIS_PORT,
          password: REDIS_PASSWORD,
          tls: REDIS_TLS_ENABLED ? {} : undefined,
          connectTimeout: 10000,
          lazyConnect: true,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        });
      }

      redisClient.on('connect', () => logger.info('Redis client connected.'));
      redisClient.on('error', (err: any) => {
        logger.warn(
          `Redis connection failed - using mock responses. Error: ${err.message}`,
        );
        redisClient = createMockRedisClient() as any;
      });

      const originalGet = redisClient.get.bind(redisClient);
      redisClient.get = async (key: string) => {
        const value = await originalGet(key);
        if (value) {
          telemetry.subsystems.cache.hits.add(1);
        } else {
          telemetry.subsystems.cache.misses.add(1);
        }
        return value;
      };

      const originalSet = redisClient.set.bind(redisClient);
      redisClient.set = async (key: string, value: string) => {
        telemetry.subsystems.cache.sets.add(1);
        return await originalSet(key, value);
      };

      const originalDel = redisClient.del.bind(redisClient);
      redisClient.del = (async (...keys: string[]) => {
        telemetry.subsystems.cache.dels.add(1);
        return await originalDel(...keys);
      }) as any;
    } catch (error: any) {
      logger.warn(
        `Redis initialization failed - using development mode. Error: ${(error as Error).message}`,
      );
      redisClient = createMockRedisClient() as any;
    }
  }
  return redisClient;
}

function createMockRedisClient() {
  return {
    get: async (key: string) => {
      logger.debug(`Mock Redis GET: Key: ${key}`);
      return null;
    },
    set: async (key: string, value: string, ...args: any[]) => {
      logger.debug(`Mock Redis SET: Key: ${key}, Value: ${value}`);
      return 'OK';
    },
    del: async (...keys: string[]) => {
      logger.debug(`Mock Redis DEL: Keys: ${keys.join(', ')}`);
      return keys.length;
    },
    exists: async (...keys: string[]) => {
      logger.debug(`Mock Redis EXISTS: Keys: ${keys.join(', ')}`);
      return 0;
    },
    expire: async (key: string, seconds: number) => {
      logger.debug(`Mock Redis EXPIRE: Key: ${key}, Seconds: ${seconds}`);
      return 1;
    },
    quit: async () => { },
    on: () => { },
    connect: async () => { },
    options: { keyPrefix: 'summit:' },
    duplicate: () => createMockRedisClient(),
  };
}

export async function redisHealthCheck(): Promise<boolean> {
  if (!redisClient) return false;
  try {
    await redisClient.ping();
    return true;
  } catch {
    return false;
  }
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis client closed.');
    redisClient = null as any; // Clear the client instance
  }
}
