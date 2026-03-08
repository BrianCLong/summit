"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock for the logger module
exports.default = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    child: jest.fn(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
    })),
};
