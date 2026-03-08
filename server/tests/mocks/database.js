"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedis = exports.closeConnections = exports.connectRedis = exports.connectPostgres = exports.connectNeo4j = exports.getRedisClient = exports.mockRedisClient = exports.getPostgresPool = exports.mockPool = exports.getNeo4jDriver = exports.mockDriver = exports.mockSession = void 0;
const globals_1 = require("@jest/globals");
exports.mockSession = {
    run: globals_1.jest.fn(),
    close: globals_1.jest.fn().mockResolvedValue(undefined),
};
exports.mockDriver = {
    session: globals_1.jest.fn(() => exports.mockSession),
    close: globals_1.jest.fn().mockResolvedValue(undefined),
    verifyConnectivity: globals_1.jest.fn().mockResolvedValue(undefined),
};
exports.getNeo4jDriver = globals_1.jest.fn(() => exports.mockDriver);
// PostgreSQL mock
exports.mockPool = {
    query: globals_1.jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: globals_1.jest.fn().mockResolvedValue({
        query: globals_1.jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: globals_1.jest.fn(),
    }),
    end: globals_1.jest.fn().mockResolvedValue(undefined),
    on: globals_1.jest.fn(),
};
exports.getPostgresPool = globals_1.jest.fn(() => exports.mockPool);
// Redis mock
exports.mockRedisClient = {
    get: globals_1.jest.fn().mockResolvedValue(null),
    set: globals_1.jest.fn().mockResolvedValue('OK'),
    del: globals_1.jest.fn().mockResolvedValue(1),
    exists: globals_1.jest.fn().mockResolvedValue(0),
    expire: globals_1.jest.fn().mockResolvedValue(1),
    hget: globals_1.jest.fn().mockResolvedValue(null),
    hset: globals_1.jest.fn().mockResolvedValue(1),
    hdel: globals_1.jest.fn().mockResolvedValue(1),
    keys: globals_1.jest.fn().mockResolvedValue([]),
    mget: globals_1.jest.fn().mockResolvedValue([]),
    scanStream: globals_1.jest.fn().mockReturnValue({
        on: globals_1.jest.fn().mockReturnThis(),
        pause: globals_1.jest.fn(),
        resume: globals_1.jest.fn(),
    }),
    on: globals_1.jest.fn(),
    quit: globals_1.jest.fn().mockResolvedValue('OK'),
    disconnect: globals_1.jest.fn(),
    publish: globals_1.jest.fn().mockResolvedValue(0),
    subscribe: globals_1.jest.fn().mockResolvedValue(1),
};
exports.getRedisClient = globals_1.jest.fn(() => exports.mockRedisClient);
// Connection functions
exports.connectNeo4j = globals_1.jest.fn().mockResolvedValue(exports.mockDriver);
exports.connectPostgres = globals_1.jest.fn().mockResolvedValue(exports.mockPool);
exports.connectRedis = globals_1.jest.fn().mockResolvedValue(exports.mockRedisClient);
exports.closeConnections = globals_1.jest.fn().mockResolvedValue(undefined);
exports.closeRedis = globals_1.jest.fn().mockResolvedValue(undefined);
// Default export for compatibility
exports.default = {
    getNeo4jDriver: exports.getNeo4jDriver,
    getPostgresPool: exports.getPostgresPool,
    getRedisClient: exports.getRedisClient,
    connectNeo4j: exports.connectNeo4j,
    connectPostgres: exports.connectPostgres,
    connectRedis: exports.connectRedis,
    closeConnections: exports.closeConnections,
    closeRedis: exports.closeRedis,
    mockDriver: exports.mockDriver,
    mockPool: exports.mockPool,
    mockRedisClient: exports.mockRedisClient,
    mockSession: exports.mockSession,
};
