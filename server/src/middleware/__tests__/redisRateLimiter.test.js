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
// Mock function declared before mock
const mockGetRedisClient = globals_1.jest.fn(() => null);
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getRedisClient: mockGetRedisClient,
}));
(0, globals_1.describe)('createRedisRateLimiter fallback behavior', () => {
    let createRedisRateLimiter;
    (0, globals_1.beforeAll)(async () => {
        ({ createRedisRateLimiter } = await Promise.resolve().then(() => __importStar(require('../redisRateLimiter.js'))));
    });
    const buildLimiter = () => createRedisRateLimiter({
        windowMs: 1000,
        max: 1,
        message: { error: 'limited' },
    });
    const runRequest = async (middleware) => {
        const req = { ip: '127.0.0.1', headers: {}, method: 'GET', path: '/limited' };
        let statusCode = 200;
        let body;
        const headers = {};
        let resolved = false;
        let resolvePromise = () => { };
        const res = {
            status: (code) => {
                statusCode = code;
                return res;
            },
            json: (payload) => {
                body = payload;
                if (!resolved) {
                    resolved = true;
                    resolvePromise();
                }
                return res;
            },
            send: (payload) => {
                body = payload;
                if (!resolved) {
                    resolved = true;
                    resolvePromise();
                }
                return res;
            },
            setHeader: (key, value) => {
                headers[key.toLowerCase()] = value;
            },
        };
        await new Promise((resolve) => {
            resolvePromise = resolve;
            middleware(req, res, () => {
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            });
        });
        return { statusCode, body, headers };
    };
    (0, globals_1.it)('falls back to in-memory counting when Redis is unavailable', async () => {
        const limiter = buildLimiter();
        const first = await runRequest(limiter);
        (0, globals_1.expect)(first.statusCode).toBe(200);
        const second = await runRequest(limiter);
        (0, globals_1.expect)(second.statusCode).toBe(429);
        (0, globals_1.expect)(second.body.error).toBe('limited');
    });
    (0, globals_1.it)('resets counts after the configured window when using fallback store', async () => {
        const limiter = buildLimiter();
        await runRequest(limiter);
        await runRequest(limiter);
        await new Promise((resolve) => setTimeout(resolve, 1100));
        const afterReset = await runRequest(limiter);
        (0, globals_1.expect)(afterReset.statusCode).toBe(200);
    });
});
