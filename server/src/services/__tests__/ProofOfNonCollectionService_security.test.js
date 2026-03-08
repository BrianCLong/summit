"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock dependencies
globals_1.jest.mock('../../db/redis.js', () => ({
    getRedisClient: globals_1.jest.fn().mockResolvedValue({}),
}));
globals_1.jest.mock('../../db/postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn().mockReturnValue({}),
}));
globals_1.jest.mock('../../utils/CircuitBreaker.js', () => ({
    CircuitBreaker: class {
        execute(fn) { return fn(); }
    }
}));
globals_1.jest.mock('fs/promises', () => ({
    mkdir: globals_1.jest.fn().mockResolvedValue(undefined),
}));
// We rely on the moduleNameMapper to provide the logger mock, but we need to spy on it.
// Since we use resetModules, we must inspect the instance used in the current run.
(0, globals_1.describe)('ProofOfNonCollectionService Security', () => {
    const originalEnv = process.env;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.resetModules();
        process.env = { ...originalEnv };
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.afterAll)(() => {
        process.env = originalEnv;
    });
    (0, globals_1.test)('should throw error in PRODUCTION if PNC_SIGNING_SECRET is missing', async () => {
        process.env.NODE_ENV = 'production';
        // Satisfy config.ts requirements for production
        process.env.JWT_SECRET = 'a-very-long-secure-random-string-that-is-at-least-32-chars';
        process.env.JWT_REFRESH_SECRET = 'another-very-long-secure-random-string-that-is-at-least-32-chars';
        process.env.DATABASE_URL = 'postgresql://user:pass@db-prod:5432/intelgraph_prod';
        process.env.POSTGRES_PASSWORD = 'strong-production-password';
        process.env.NEO4J_URI = 'bolt://neo4j-prod:7687';
        process.env.NEO4J_PASSWORD = 'strong-production-password';
        process.env.REDIS_PASSWORD = 'strong-redis-password';
        process.env.CORS_ORIGIN = 'https://app.intelgraph.com';
        process.env.REDIS_HOST = 'redis-prod';
        delete process.env.PNC_SIGNING_SECRET;
        await (0, globals_1.expect)(async () => {
            await Promise.resolve().then(() => __importStar(require('../ProofOfNonCollectionService.js')));
        }).rejects.toThrow('PNC_SIGNING_SECRET environment variable is required in production');
    });
    (0, globals_1.test)('should warn in NON-PRODUCTION if PNC_SIGNING_SECRET is missing', async () => {
        process.env.NODE_ENV = 'development';
        delete process.env.PNC_SIGNING_SECRET;
        // Import logger first to spy on it
        const loggerModule = await Promise.resolve().then(() => __importStar(require('../../utils/logger.js')));
        const warnSpy = globals_1.jest.spyOn(loggerModule.default, 'warn');
        // Import service (which uses the same logger module instance from current registry)
        await Promise.resolve().then(() => __importStar(require('../ProofOfNonCollectionService.js')));
        (0, globals_1.expect)(warnSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining('PNC_SIGNING_SECRET not set'));
    });
    (0, globals_1.test)('should NOT throw or warn if PNC_SIGNING_SECRET is present', async () => {
        process.env.NODE_ENV = 'production';
        // Satisfy config.ts requirements for production
        process.env.JWT_SECRET = 'a-very-long-secure-random-string-that-is-at-least-32-chars';
        process.env.JWT_REFRESH_SECRET = 'another-very-long-secure-random-string-that-is-at-least-32-chars';
        process.env.DATABASE_URL = 'postgresql://user:pass@db-prod:5432/intelgraph_prod';
        process.env.POSTGRES_PASSWORD = 'strong-production-password';
        process.env.NEO4J_URI = 'bolt://neo4j-prod:7687';
        process.env.NEO4J_PASSWORD = 'strong-production-password';
        process.env.REDIS_PASSWORD = 'strong-redis-password';
        process.env.CORS_ORIGIN = 'https://app.intelgraph.com';
        process.env.REDIS_HOST = 'redis-prod';
        process.env.PNC_SIGNING_SECRET = 'valid-secret-that-is-long-enough';
        // Import logger to spy
        const loggerModule = await Promise.resolve().then(() => __importStar(require('../../utils/logger.js')));
        const warnSpy = globals_1.jest.spyOn(loggerModule.default, 'warn');
        await Promise.resolve().then(() => __importStar(require('../ProofOfNonCollectionService.js')));
        (0, globals_1.expect)(warnSpy).not.toHaveBeenCalledWith(globals_1.expect.stringContaining('PNC_SIGNING_SECRET not set'));
    });
});
