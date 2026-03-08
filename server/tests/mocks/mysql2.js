"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConnection = exports.createPool = void 0;
const globals_1 = require("@jest/globals");
exports.createPool = globals_1.jest.fn().mockReturnValue({
    query: globals_1.jest.fn().mockResolvedValue([[], []]),
    execute: globals_1.jest.fn().mockResolvedValue([[], []]),
    getConnection: globals_1.jest.fn().mockResolvedValue({
        query: globals_1.jest.fn().mockResolvedValue([[], []]),
        release: globals_1.jest.fn(),
    }),
    end: globals_1.jest.fn().mockResolvedValue(undefined),
});
exports.createConnection = globals_1.jest.fn().mockResolvedValue({
    query: globals_1.jest.fn().mockResolvedValue([[], []]),
    execute: globals_1.jest.fn().mockResolvedValue([[], []]),
    end: globals_1.jest.fn().mockResolvedValue(undefined),
});
exports.default = { createPool: exports.createPool, createConnection: exports.createConnection };
