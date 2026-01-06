import Redis from 'ioredis';
import { dbUrls } from '../../config.js';
import type { PredictionOutput } from './types.js';

export interface PredictionCache {
  get(entityId: string, modelVersion: string): Promise<PredictionOutput | null>;
  set(
    entityId: string,
    modelVersion: string,
    prediction: PredictionOutput,
    ttlSeconds: number,
  ): Promise<void>;
  flush(): Promise<number>;
}

const keyPrefix = 'mlops:prediction:';

const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL || dbUrls.redis;
  return new Redis(redisUrl, {
    lazyConnect: true,
  });
};

export class RedisPredictionCache implements PredictionCache {
  private client: Redis;

  constructor(client?: Redis) {
    this.client = client ?? createRedisClient();
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.status === 'ready') {
      return;
    }
    if (this.client.status === 'end') {
      this.client = createRedisClient();
    }
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }

  private key(entityId: string, modelVersion: string) {
    return `${keyPrefix}${entityId}:${modelVersion}`;
  }

  async get(
    entityId: string,
    modelVersion: string,
  ): Promise<PredictionOutput | null> {
    await this.ensureConnected();
    const result = await this.client.get(this.key(entityId, modelVersion));
    return result ? (JSON.parse(result) as PredictionOutput) : null;
  }

  async set(
    entityId: string,
    modelVersion: string,
    prediction: PredictionOutput,
    ttlSeconds: number,
  ): Promise<void> {
    await this.ensureConnected();
    await this.client.setex(
      this.key(entityId, modelVersion),
      ttlSeconds,
      JSON.stringify(prediction),
    );
  }

  async flush(): Promise<number> {
    await this.ensureConnected();
    let cursor = '0';
    let deleted = 0;
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        `${keyPrefix}*`,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        deleted += await this.client.del(keys);
      }
    } while (cursor !== '0');
    return deleted;
  }
}

export class MemoryPredictionCache implements PredictionCache {
  private store = new Map<string, { value: PredictionOutput; expiresAt: number }>();

  private key(entityId: string, modelVersion: string) {
    return `${entityId}:${modelVersion}`;
  }

  async get(
    entityId: string,
    modelVersion: string,
  ): Promise<PredictionOutput | null> {
    const key = this.key(entityId, modelVersion);
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(
    entityId: string,
    modelVersion: string,
    prediction: PredictionOutput,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.key(entityId, modelVersion);
    this.store.set(key, {
      value: prediction,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async flush(): Promise<number> {
    const deleted = this.store.size;
    this.store.clear();
    return deleted;
  }
}

export const buildPredictionCache = (): PredictionCache => {
  if (process.env.MLOPS_REDIS_DISABLED === 'true' || process.env.NODE_ENV === 'test') {
    return new MemoryPredictionCache();
  }
  return new RedisPredictionCache();
};
