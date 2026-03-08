"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Configuration Validation', () => {
    let originalEnv;
    let exitSpy;
    let consoleErrorSpy;
    let consoleLogSpy;
    (0, globals_1.beforeEach)(() => {
        originalEnv = { ...process.env };
        globals_1.jest.resetModules();
        exitSpy = globals_1.jest.spyOn(process, 'exit').mockImplementation((() => {
            throw new Error('process.exit called');
        }));
        consoleErrorSpy = globals_1.jest.spyOn(console, 'error').mockImplementation(() => { });
        consoleLogSpy = globals_1.jest.spyOn(console, 'log').mockImplementation(() => { });
    });
    (0, globals_1.afterEach)(() => {
        process.env = originalEnv;
        globals_1.jest.restoreAllMocks();
    });
    const loadConfig = () => require('../config.js');
    const setValidEnv = () => {
        process.env.NODE_ENV = 'development';
        process.env.PORT = '4000';
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
        process.env.NEO4J_URI = 'bolt://localhost:7687';
        process.env.NEO4J_USER = 'neo4j';
        process.env.NEO4J_PASSWORD = 'password';
        process.env.REDIS_HOST = 'localhost';
        process.env.REDIS_PORT = '6379';
        process.env.JWT_SECRET = 'at-least-32-chars-long-secure-random-key-value';
        process.env.JWT_REFRESH_SECRET = 'at-least-32-chars-long-secure-random-refresh-key-value';
        process.env.CORS_ORIGIN = 'http://localhost:3000';
        // Add defaults for optional/defaulted fields just in case
        process.env.RATE_LIMIT_WINDOW_MS = '60000';
    };
    (0, globals_1.it)('fails when critical variables are missing (JWT_SECRET)', () => {
        setValidEnv();
        delete process.env.JWT_SECRET;
        (0, globals_1.expect)(() => loadConfig()).toThrow('process.exit called');
        (0, globals_1.expect)(exitSpy).toHaveBeenCalledWith(1);
        (0, globals_1.expect)(consoleErrorSpy).toHaveBeenCalled();
        const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
        (0, globals_1.expect)(errorCalls).toContain('JWT_SECRET');
    });
    (0, globals_1.it)('fails when critical variables are missing (DATABASE_URL)', () => {
        setValidEnv();
        delete process.env.DATABASE_URL;
        (0, globals_1.expect)(() => loadConfig()).toThrow('process.exit called');
        const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
        (0, globals_1.expect)(errorCalls).toContain('DATABASE_URL');
    });
    (0, globals_1.it)('fails when JWT_SECRET is too short in production', () => {
        setValidEnv();
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'short';
        // Ensure other prod constraints are met so we fail on the SECRET
        process.env.DATABASE_URL = 'postgresql://user:pass@prod-db:5432/db';
        process.env.NEO4J_URI = 'bolt://prod-neo4j:7687';
        process.env.NEO4J_PASSWORD = 'secure-password';
        process.env.REDIS_PASSWORD = 'secure-password';
        process.env.CORS_ORIGIN = 'https://app.example.com';
        (0, globals_1.expect)(() => loadConfig()).toThrow('process.exit called');
        const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
        (0, globals_1.expect)(errorCalls).toContain('String must contain at least 32 character(s)');
    });
    (0, globals_1.it)('fails when DATABASE_URL contains localhost in production', () => {
        setValidEnv();
        process.env.NODE_ENV = 'production';
        process.env.DATABASE_URL = 'postgresql://postgres:pass@localhost:5432/db';
        // Ensure other prod constraints are met
        process.env.JWT_SECRET = 'a-super-long-secure-random-that-is-at-least-32-chars';
        process.env.JWT_REFRESH_SECRET = 'a-super-long-secure-random-that-is-at-least-32-chars';
        process.env.NEO4J_URI = 'bolt://prod-neo4j:7687';
        process.env.NEO4J_PASSWORD = 'secure-password';
        process.env.REDIS_PASSWORD = 'secure-password';
        process.env.CORS_ORIGIN = 'https://app.example.com';
        (0, globals_1.expect)(() => loadConfig()).toThrow('process.exit called');
        const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
        (0, globals_1.expect)(errorCalls).toContain('contains localhost/devpassword');
    });
    (0, globals_1.it)('succeeds with valid development config', () => {
        setValidEnv();
        (0, globals_1.expect)(() => loadConfig()).not.toThrow();
        (0, globals_1.expect)(exitSpy).not.toHaveBeenCalled();
    });
});
