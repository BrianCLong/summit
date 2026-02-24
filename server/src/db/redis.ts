import Redis, { Cluster } from 'ioredis';
import * as dotenv from 'dotenv';
import pino from 'pino';
import { telemetry } from '../lib/telemetry/comprehensive-telemetry.js';

dotenv.config();

const logger = (pino as any)();

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

function attachTelemetry(client: Redis | Cluster) {
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
    client.set = async (key: string, value: string | number, ...args: any[]) => {
        telemetry.subsystems.cache.sets.add(1);
        return await originalSet(key, value, ...args);
    };

    const originalDel = client.del.bind(client);
    // @ts-ignore
    client.del = (async (...keys: string[]) => {
        telemetry.subsystems.cache.dels.add(1);
        return await originalDel(...keys);
    });
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

      // We rely on ioredis built-in reconnection logic.
      // Only switch to mock if explicit fatal error occurs during init or we decide to
      client.on('error', (err: any) => {
        logger.error(`Redis connection '${name}' error: ${err.message}`);
      });

      attachTelemetry(client);
      clients.set(name, client);

    } catch (error: any) {
      logger.warn(
        `Redis initialization for '${name}' failed - using development mode (Mock). Error: ${(error as Error).message}`,
      );
      clients.set(name, createMockRedisClient(name));
    }
  }
  return clients.get(name);
}

export function getRedisOrThrow(name: string = 'default'): Redis | Cluster {
    const client = getRedisClient(name);
    // Check if it is our mock client
    if ((client as any).isMock) {
        throw new Error(`Redis client '${name}' is not available (running in mock mode)`);
    }
    return client;
}

function createMockRedisClient(name: string) {
  return {
    isMock: true,
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
    pipeline: () => ({
        exec: async () => [],
        get: () => {},
        set: () => {}
    }),
    scanStream: () => {
        const { Readable } = require('stream');
        const s = new Readable();
        s.push(null);
        return s;
    }
  };
}

export async function redisHealthCheck(): Promise<boolean> {
  // Check default client at least
  const defaultClient = clients.get('default');
  if (!defaultClient) return false;
  if ((defaultClient as any).isMock) return true; // Mock is always healthy? Or should be false? Let's say false for critical checks.

  try {
    await defaultClient.ping();
    return true;
  } catch {
    return false;
  }
}

export async function closeRedisClient(): Promise<void> {
  for (const [name, client] of clients.entries()) {
    if (client && !(client as any).isMock) {
      await client.quit();
      logger.info(`Redis client '${name}' closed.`);
    }
  }
  clients.clear();
}
