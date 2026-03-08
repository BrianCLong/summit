"use strict";
// Mock factories for external services
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockNeo4jDriver = exports.createMockNeo4jSession = exports.createMockRedis = exports.createMockLogger = void 0;
const createMockLogger = () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
});
exports.createMockLogger = createMockLogger;
const createMockRedis = () => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
});
exports.createMockRedis = createMockRedis;
const createMockNeo4jSession = () => ({
    run: jest.fn().mockResolvedValue({ records: [] }),
    close: jest.fn(),
});
exports.createMockNeo4jSession = createMockNeo4jSession;
const createMockNeo4jDriver = () => ({
    session: jest.fn(() => (0, exports.createMockNeo4jSession)()),
    close: jest.fn(),
});
exports.createMockNeo4jDriver = createMockNeo4jDriver;
