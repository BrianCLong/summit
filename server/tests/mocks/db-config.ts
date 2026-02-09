import { jest } from '@jest/globals';
import { mockPool, mockClient } from './pg.js';

export const connectPostgres = jest.fn().mockResolvedValue(mockPool);
export const connectNeo4j = jest.fn().mockResolvedValue({ session: () => ({ run: jest.fn(), close: jest.fn() }) });
export const connectRedis = jest.fn().mockResolvedValue({});
export const getPostgresPool = jest.fn(() => mockPool);
export const getNeo4jDriver = jest.fn();
export const getRedisClient = jest.fn();
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
