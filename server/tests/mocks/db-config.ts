import { jest } from '@jest/globals';
import { mockPool, mockClient } from './pg.js';

const mockSession = {
    run: jest.fn().mockResolvedValue({ records: [] }),
    close: jest.fn().mockResolvedValue(undefined),
    beginTransaction: jest.fn(() => ({
        run: jest.fn().mockResolvedValue({ records: [] }),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
    })),
};

const mockDriver = {
    session: jest.fn(() => mockSession),
    close: jest.fn().mockResolvedValue(undefined),
    verifyConnectivity: jest.fn().mockResolvedValue(undefined),
};

const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
    mget: jest.fn().mockResolvedValue([]),
    smembers: jest.fn().mockResolvedValue([]),
    sadd: jest.fn().mockResolvedValue(1),
    quit: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
};

export const connectPostgres = jest.fn().mockResolvedValue(mockPool);
export const connectNeo4j = jest.fn().mockResolvedValue(mockDriver);
export const connectRedis = jest.fn().mockResolvedValue(mockRedis);
export const getPostgresPool = jest.fn(() => mockPool);
export const getNeo4jDriver = jest.fn(() => mockDriver);
export const getRedisClient = jest.fn(() => mockRedis);
export const closeConnections = jest.fn().mockResolvedValue(undefined);

export default {
    connectPostgres,
    connectNeo4j,
    connectRedis,
    getPostgresPool,
    getNeo4jDriver,
    getRedisClient,
    closeConnections,
};
