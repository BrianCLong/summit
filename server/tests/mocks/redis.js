"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = exports.mockRedisClient = void 0;
const globals_1 = require("@jest/globals");
exports.mockRedisClient = {
    connect: globals_1.jest.fn().mockResolvedValue(undefined),
    quit: globals_1.jest.fn().mockResolvedValue(undefined),
    get: globals_1.jest.fn().mockResolvedValue(null),
    set: globals_1.jest.fn().mockResolvedValue('OK'),
    setex: globals_1.jest.fn().mockResolvedValue('OK'),
    exists: globals_1.jest.fn().mockResolvedValue(0),
    keys: globals_1.jest.fn().mockResolvedValue([]),
    del: globals_1.jest.fn().mockResolvedValue(1),
    ping: globals_1.jest.fn().mockResolvedValue('PONG'),
};
exports.createClient = globals_1.jest.fn(() => exports.mockRedisClient);
exports.default = { createClient: exports.createClient };
