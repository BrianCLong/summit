"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationStorage = exports.logger = void 0;
console.log('DEBUG: config-logger.ts LOADED');
const globals_1 = require("@jest/globals");
exports.logger = {
    info: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
    child: globals_1.jest.fn().mockReturnThis(),
    trace: globals_1.jest.fn(),
    fatal: globals_1.jest.fn(),
    silent: globals_1.jest.fn(),
    level: 'debug',
};
exports.correlationStorage = {
    getStore: globals_1.jest.fn(),
    run: globals_1.jest.fn((store, cb) => cb()),
    enterWith: globals_1.jest.fn(),
};
exports.default = exports.logger;
