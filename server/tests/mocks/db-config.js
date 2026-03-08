"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeConnections = exports.getRedisClient = exports.getNeo4jDriver = exports.getPostgresPool = exports.connectRedis = exports.connectNeo4j = exports.connectPostgres = void 0;
const globals_1 = require("@jest/globals");
const pg_js_1 = require("./pg.js");
exports.connectPostgres = globals_1.jest.fn().mockResolvedValue(pg_js_1.mockPool);
exports.connectNeo4j = globals_1.jest.fn().mockResolvedValue({ session: () => ({ run: globals_1.jest.fn(), close: globals_1.jest.fn() }) });
exports.connectRedis = globals_1.jest.fn().mockResolvedValue({});
exports.getPostgresPool = globals_1.jest.fn(() => pg_js_1.mockPool);
const mockDriver = {
    session: globals_1.jest.fn().mockReturnValue({
        run: globals_1.jest.fn().mockResolvedValue({ records: [] }),
        close: globals_1.jest.fn().mockResolvedValue(undefined),
    }),
    close: globals_1.jest.fn().mockResolvedValue(undefined),
};
exports.getNeo4jDriver = globals_1.jest.fn(() => mockDriver);
exports.getRedisClient = globals_1.jest.fn();
exports.closeConnections = globals_1.jest.fn().mockResolvedValue(undefined);
exports.default = {
    connectPostgres: exports.connectPostgres,
    connectNeo4j: exports.connectNeo4j,
    connectRedis: exports.connectRedis,
    getPostgresPool: exports.getPostgresPool,
    getNeo4jDriver: exports.getNeo4jDriver,
    getRedisClient: exports.getRedisClient,
    closeConnections: exports.closeConnections,
};
