"use strict";
/**
 * Jest Test Setup
 *
 * Global setup for all tests including database mocking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock database connection
globals_1.jest.mock('../src/db/connection.js', () => ({
    createPool: globals_1.jest.fn(),
    getPool: globals_1.jest.fn(() => ({
        query: globals_1.jest.fn(),
        connect: globals_1.jest.fn(),
        end: globals_1.jest.fn(),
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
    })),
    query: globals_1.jest.fn(),
    getClient: globals_1.jest.fn(),
    transaction: globals_1.jest.fn(async (callback) => {
        const mockClient = {
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        };
        return callback(mockClient);
    }),
    healthCheck: globals_1.jest.fn().mockResolvedValue({
        status: 'healthy',
        latency: 5,
        poolSize: 5,
        idleCount: 3,
        waitingCount: 0,
    }),
    closePool: globals_1.jest.fn(),
}));
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
// Global test timeout
globals_1.jest.setTimeout(30000);
// Clean up after each test
afterEach(() => {
    globals_1.jest.clearAllMocks();
});
