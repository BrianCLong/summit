import { jest } from '@jest/globals';

export const mockRedisClient = {
  get: jest.fn().mockResolvedValue(null as never),
  set: jest.fn().mockResolvedValue('OK' as never),
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
};

export const getRedisClient = jest.fn(() => mockRedisClient);
export const initRedisClient = jest.fn().mockResolvedValue(mockRedisClient);
export const closeRedisClient = jest.fn().mockResolvedValue(undefined as never);

export default {
  getRedisClient,
  initRedisClient,
  closeRedisClient,
  mockRedisClient,
};
