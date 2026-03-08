"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedisClient = exports.initRedisClient = exports.getRedisClient = exports.mockRedisClient = void 0;
const globals_1 = require("@jest/globals");
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
exports.initRedisClient = globals_1.jest.fn().mockResolvedValue(exports.mockRedisClient);
exports.closeRedisClient = globals_1.jest.fn().mockResolvedValue(undefined);
exports.default = {
    getRedisClient: exports.getRedisClient,
    initRedisClient: exports.initRedisClient,
    closeRedisClient: exports.closeRedisClient,
    mockRedisClient: exports.mockRedisClient,
};
