import { jest } from '@jest/globals';

export const mockSession = {
  run: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined as never),
};

export const mockDriver = {
  session: jest.fn(() => mockSession),
  close: jest.fn().mockResolvedValue(undefined as never),
  verifyConnectivity: jest.fn().mockResolvedValue(undefined as never),
};

export const getNeo4jDriver = jest.fn(() => mockDriver);

// PostgreSQL mock
export const mockPool = {
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  }),
  end: jest.fn().mockResolvedValue(undefined as never),
  on: jest.fn(),
};
export const getPostgresPool = jest.fn(() => mockPool);

// Redis mock
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

// Connection functions
export const connectNeo4j = jest.fn().mockResolvedValue(mockDriver);
export const connectPostgres = jest.fn().mockResolvedValue(mockPool);
export const connectRedis = jest.fn().mockResolvedValue(mockRedisClient);
export const closeConnections = jest.fn().mockResolvedValue(undefined);
export const closeRedis = jest.fn().mockResolvedValue(undefined);

// Default export for compatibility
export default {
  getNeo4jDriver,
  getPostgresPool,
  getRedisClient,
  connectNeo4j,
  connectPostgres,
  connectRedis,
  closeConnections,
  closeRedis,
  mockDriver,
  mockPool,
  mockRedisClient,
  mockSession,
};
