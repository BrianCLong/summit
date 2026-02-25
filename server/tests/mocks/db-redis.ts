import { jest } from '@jest/globals';

export const mockRedisClient = {
  get: jest.fn().mockResolvedValue(null as never),
  set: jest.fn().mockResolvedValue('OK' as never),
  setex: jest.fn().mockResolvedValue('OK' as never), // Added setex
  del: jest.fn().mockResolvedValue(1 as never),
  exists: jest.fn().mockResolvedValue(0 as never),
  expire: jest.fn().mockResolvedValue(1 as never),
  hget: jest.fn().mockResolvedValue(null as never),
  hset: jest.fn().mockResolvedValue(1 as never),
  hdel: jest.fn().mockResolvedValue(1 as never),
  keys: jest.fn().mockResolvedValue([] as never),
  mget: jest.fn().mockResolvedValue([] as never),
  scanStream: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    pause: jest.fn(),
    resume: jest.fn(),
  }),
  on: jest.fn(),
  quit: jest.fn().mockResolvedValue('OK' as never),
  disconnect: jest.fn(),
  publish: jest.fn().mockResolvedValue(0 as never),
  subscribe: jest.fn().mockResolvedValue(1 as never),
  ttl: jest.fn().mockResolvedValue(-1 as never), // Added ttl
  pipeline: jest.fn().mockReturnValue({
    set: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([] as never),
  }),
};

export const getRedisClient = jest.fn(() => mockRedisClient);
export const initRedisClient = jest.fn().mockResolvedValue(mockRedisClient);
export const closeRedisClient = jest.fn().mockResolvedValue(undefined as never);

export class RedisService {
  private static instance: RedisService;
  public client = mockRedisClient;

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  getClient() {
    return this.client;
  }

  async publish(channel: string, message: string) {
    return this.client.publish(channel, message);
  }

  async hgetall(key: string) {
    return {};
  }

  async hincrby(key: string, field: string, increment: number) {
    return increment;
  }

  async hdel(key: string, field: string) {
    return this.client.hdel(key, field);
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async setex(key: string, seconds: number, value: string) {
    return this.client.setex(key, seconds, value);
  }

  async ping() {
    return 'PONG';
  }

  async close() {
    return this.client.quit();
  }

  async del(key: string) {
    return this.client.del(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) return this.client.setex(key, ttlSeconds, value);
    return this.client.set(key, value);
  }

  async getKeysByPattern(pattern: string) {
    return this.client.keys(pattern);
  }
}

export default {
  getRedisClient,
  initRedisClient,
  closeRedisClient,
  mockRedisClient,
  RedisService,
};
