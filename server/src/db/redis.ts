import Redis from 'ioredis';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger: pino.Logger = pino();

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'devpassword';

const REDIS_FAILURE_THRESHOLD = parseInt(
  process.env.REDIS_FAILURE_THRESHOLD ?? '3',
  10,
);
const REDIS_COOLDOWN_MS = parseInt(
  process.env.REDIS_COOLDOWN_MS ?? '20000',
  10,
);

type RedisCircuitState = 'closed' | 'half-open' | 'open';

export type RedisHealth = {
  healthy: boolean;
  circuitState: RedisCircuitState;
  latencyMs?: number;
  lastError?: string;
};

let redisClient: Redis | null = null;
let redisMockMode = false;
let redisFailureCount = 0;
let redisCircuitOpenUntil = 0;
let redisLastError: string | undefined;

function getRedisCircuitState(): RedisCircuitState {
  if (redisCircuitOpenUntil === 0) {
    return 'closed';
  }

  if (Date.now() >= redisCircuitOpenUntil) {
    return 'half-open';
  }

  return 'open';
}

function recordRedisSuccess(): void {
  redisFailureCount = 0;
  redisCircuitOpenUntil = 0;
  redisLastError = undefined;
}

function recordRedisFailure(error: Error): void {
  redisFailureCount += 1;
  redisLastError = error.message;

  if (redisFailureCount >= REDIS_FAILURE_THRESHOLD) {
    redisCircuitOpenUntil = Date.now() + REDIS_COOLDOWN_MS;
  }
}

import { telemetry } from '../lib/telemetry/comprehensive-telemetry';

function buildRedisClient(): Redis {
  const client = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    connectTimeout: 5000,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (attempt) => Math.min(attempt * 200, 2000),
    reconnectOnError: (err) => {
      const message = err?.message ?? '';
      const shouldReconnect =
        message.includes('READONLY') ||
        message.includes('ECONNRESET') ||
        message.includes('EAI_AGAIN');

      if (shouldReconnect) {
        recordRedisFailure(err as Error);
      }

      return shouldReconnect;
    },
  });

  client.on('ready', () => {
    recordRedisSuccess();
    logger.info('Redis client connected.');
  });

  client.on('error', (err) => {
    recordRedisFailure(err as Error);
    logger.warn(
      `Redis connectivity issue (${getRedisCircuitState()} circuit): ${err.message}`,
    );
  });

  client.on('end', () => {
    logger.warn('Redis connection ended; awaiting automatic reconnect');
  });

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
  client.del = async (key: string) => {
    telemetry.subsystems.cache.dels.add(1);
    return await originalDel(key);
  };

  return client;
}

export function getRedisClient(): Redis {
  if (!redisClient || redisClient.status === 'end') {
    try {
      redisClient = buildRedisClient();
      redisMockMode = false;
    } catch (error) {
      logger.warn(
        `Redis initialization failed - using development mode. Error: ${(error as Error).message}`,
      );
      redisClient = createMockRedisClient() as any;
      redisMockMode = true;
      recordRedisFailure(error as Error);
    }
  }

  return redisClient as Redis;
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
    ping: async () => 'PONG',
    quit: async () => {},
    on: () => {},
    connect: async () => {},
  };
}

export async function getRedisHealth(): Promise<RedisHealth> {
  const circuitState = getRedisCircuitState();

  if (circuitState === 'open') {
    return {
      healthy: false,
      circuitState,
      lastError: redisLastError,
    };
  }

  const client = getRedisClient();

  if (redisMockMode) {
    return {
      healthy: false,
      circuitState,
      lastError: 'Redis client running in mock mode',
    };
  }

  const start = Date.now();

  try {
    await client.ping();
    recordRedisSuccess();

    return {
      healthy: true,
      circuitState: getRedisCircuitState(),
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    recordRedisFailure(error as Error);

    try {
      client.disconnect();
    } catch (disconnectError) {
      logger.warn('Redis disconnect failed during health check', disconnectError);
    }

    redisClient = null;

    return {
      healthy: false,
      circuitState: getRedisCircuitState(),
      lastError: (error as Error).message,
    };
  }
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis client closed.');
    redisClient = null; // Clear the client instance
  }
  redisMockMode = false;
  redisFailureCount = 0;
  redisCircuitOpenUntil = 0;
  redisLastError = undefined;
}
