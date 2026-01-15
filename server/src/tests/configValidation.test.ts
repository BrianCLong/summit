
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Configuration Validation', () => {
    let originalEnv: NodeJS.ProcessEnv;
    let exitSpy: any;
    let consoleErrorSpy: any;
    let consoleLogSpy: any;

    beforeEach(() => {
        originalEnv = { ...process.env };
        jest.resetModules();
        exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
            throw new Error('process.exit called');
        }) as any);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.restoreAllMocks();
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

    it('fails when critical variables are missing (JWT_SECRET)', () => {
        setValidEnv();
        delete process.env.JWT_SECRET;
        expect(() => loadConfig()).toThrow('process.exit called');
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(consoleErrorSpy).toHaveBeenCalled();
        const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
        expect(errorCalls).toContain('JWT_SECRET');
    });

    it('fails when critical variables are missing (DATABASE_URL)', () => {
        setValidEnv();
        delete process.env.DATABASE_URL;
        expect(() => loadConfig()).toThrow('process.exit called');
        const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
        expect(errorCalls).toContain('DATABASE_URL');
    });

    it('fails when JWT_SECRET is too short in production', () => {
        setValidEnv();
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'short';

        // Ensure other prod constraints are met so we fail on the SECRET
        process.env.DATABASE_URL = 'postgresql://user:pass@prod-db:5432/db';
        process.env.NEO4J_URI = 'bolt://prod-neo4j:7687';
        process.env.NEO4J_PASSWORD = 'secure-password';
        process.env.REDIS_PASSWORD = 'secure-password';
        process.env.CORS_ORIGIN = 'https://app.example.com';

        expect(() => loadConfig()).toThrow('process.exit called');
        const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
        expect(errorCalls).toContain('String must contain at least 32 character(s)');
    });

    it('fails when DATABASE_URL contains localhost in production', () => {
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

        expect(() => loadConfig()).toThrow('process.exit called');
        const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
        expect(errorCalls).toContain('contains localhost/devpassword');
    });

    it('succeeds with valid development config', () => {
        setValidEnv();
        expect(() => loadConfig()).not.toThrow();
        expect(exitSpy).not.toHaveBeenCalled();
    });
});
