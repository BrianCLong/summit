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
const store = new Map();
const getRedisClientMock = globals_1.jest.fn();
// Mock Redis - declared before mock
const redisMock = {
    eval: globals_1.jest.fn(async (_script, _keys, key, _points, windowMs) => {
        const now = Date.now();
        const currentEntry = store.get(key);
        if (!currentEntry || currentEntry.expiresAt <= now) {
            store.set(key, { count: 0, expiresAt: now + windowMs });
        }
        const entry = store.get(key);
        const updatedCount = entry.count + 1;
        store.set(key, { count: updatedCount, expiresAt: entry.expiresAt });
        return [updatedCount, entry.expiresAt - now];
    }),
};
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getRedisClient: getRedisClientMock,
}));
(0, globals_1.describe)('RateLimiter', () => {
    let RateLimiter;
    let limiter;
    (0, globals_1.beforeAll)(async () => {
        ({ RateLimiter } = await Promise.resolve().then(() => __importStar(require('../RateLimiter.js'))));
        limiter = new RateLimiter();
    });
    (0, globals_1.beforeEach)(() => {
        store.clear();
        globals_1.jest.useFakeTimers();
        getRedisClientMock.mockReturnValue(redisMock);
        redisMock.eval.mockClear();
        redisMock.eval.mockImplementation(async (_script, _keys, key, _points, windowMs) => {
            const now = Date.now();
            const currentEntry = store.get(key);
            if (!currentEntry || currentEntry.expiresAt <= now) {
                store.set(key, { count: 0, expiresAt: now + windowMs });
            }
            const entry = store.get(key);
            const updatedCount = entry.count + 1;
            store.set(key, { count: updatedCount, expiresAt: entry.expiresAt });
            return [updatedCount, entry.expiresAt - now];
        });
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('allows requests under the limit', async () => {
        const result = await limiter.checkLimit('user:test', 3, 1000);
        (0, globals_1.expect)(result.allowed).toBe(true);
        (0, globals_1.expect)(result.remaining).toBe(2);
        (0, globals_1.expect)(result.total).toBe(3);
        (0, globals_1.expect)(result.reset).toBeGreaterThan(Date.now());
        (0, globals_1.expect)(redisMock.eval).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('blocks when the limit is exceeded and surfaces retry time', async () => {
        await limiter.checkLimit('ip:1.2.3.4', 1, 5000);
        const blocked = await limiter.consume('ip:1.2.3.4', 1, 1, 5000);
        (0, globals_1.expect)(blocked.allowed).toBe(false);
        (0, globals_1.expect)(blocked.remaining).toBe(0);
        (0, globals_1.expect)(blocked.reset).toBeGreaterThan(Date.now());
    });
});
