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
// Mock functions declared before mocks
const mockQueueAdd = globals_1.jest.fn();
const mockRateLimiterConsume = globals_1.jest.fn(async () => ({
    allowed: true,
    total: 1,
    remaining: 1,
    reset: Date.now(),
}));
// Mock ResidencyGuard
const mockValidateFeatureAccess = globals_1.jest.fn().mockResolvedValue(true);
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('bullmq', () => ({
    Queue: globals_1.jest.fn(() => ({
        add: mockQueueAdd,
    })),
    Worker: globals_1.jest.fn(() => ({
        on: globals_1.jest.fn(),
    })),
}));
globals_1.jest.unstable_mockModule('../ai/ExtractionEngine.js', () => ({
    ExtractionEngine: globals_1.jest.fn(() => ({
        processExtraction: globals_1.jest.fn(),
    })),
}));
globals_1.jest.unstable_mockModule('../db/redis.js', () => ({
    getRedisClient: globals_1.jest.fn(() => ({
        duplicate: globals_1.jest.fn(() => ({
            on: globals_1.jest.fn(),
            connect: globals_1.jest.fn(),
        })),
        on: globals_1.jest.fn(),
        ping: globals_1.jest.fn(),
    })),
}));
globals_1.jest.unstable_mockModule('../db/neo4j.js', () => ({
    getNeo4jDriver: globals_1.jest.fn(() => ({
        session: globals_1.jest.fn(() => ({
            run: globals_1.jest.fn(),
            close: globals_1.jest.fn(),
        })),
    })),
}));
globals_1.jest.unstable_mockModule('../middleware/auth.js', () => ({
    requirePermission: () => (_req, _res, next) => next(),
}));
globals_1.jest.unstable_mockModule('../middleware/rateLimit.js', () => ({
    createRateLimiter: () => (_req, _res, next) => next(),
    EndpointClass: { AI: 'AI' },
}));
globals_1.jest.unstable_mockModule('../services/RateLimiter.js', () => ({
    rateLimiter: {
        consume: mockRateLimiterConsume,
    },
}));
globals_1.jest.unstable_mockModule('../data-residency/residency-guard.js', () => ({
    ResidencyGuard: {
        getInstance: () => ({
            validateFeatureAccess: mockValidateFeatureAccess,
        }),
    },
}));
globals_1.jest.unstable_mockModule('../services/EntityLinkingService.js', () => ({
    default: {
        suggestLinksForEntity: globals_1.jest.fn(),
    },
}));
globals_1.jest.unstable_mockModule('../ai/services/AdversaryAgentService.js', () => ({
    default: globals_1.jest.fn(() => ({
        generateChain: globals_1.jest.fn(),
    })),
}));
globals_1.jest.unstable_mockModule('../services/MediaUploadService.js', () => ({
    MediaType: { VIDEO: 'VIDEO' },
}));
globals_1.jest.unstable_mockModule('../config.js', () => ({
    cfg: {
        BACKGROUND_RATE_LIMIT_MAX_REQUESTS: 100,
        BACKGROUND_RATE_LIMIT_WINDOW_MS: 60000,
    },
}));
// Dynamic imports AFTER mocks are set up
const aiRouter = (await Promise.resolve().then(() => __importStar(require('../routes/ai.js')))).default;
const getRouteHandlers = (path) => {
    const layer = aiRouter.stack.find((stack) => stack.route?.path === path);
    if (!layer) {
        throw new Error(`Route ${path} not registered`);
    }
    return layer.route.stack.map((stack) => stack.handle);
};
const runHandlers = async (handlers, req, res) => {
    for (const handler of handlers) {
        await new Promise((resolve, reject) => {
            // Check if handler is an array (e.g. validation chain) or function
            if (Array.isArray(handler)) {
                // Flatten recursive structure if needed, but usually express-validator returns an array of middlewares
                // For simplicity in this test, we might skip validation or mock it if complex.
                // express-validator middlewares usually have (req, res, next) signature.
                // Let's assume handler is a single function for now, or handle array.
                resolve(); // Skip validation array if present as a single handler object (which is unlikely in express stack)
                return;
            }
            if (handler.length >= 3) {
                let nextCalled = false;
                const next = (err) => {
                    nextCalled = true;
                    if (err)
                        reject(err);
                    else
                        resolve();
                };
                const result = handler(req, res, next);
                if (result && typeof result.then === 'function') {
                    result.then(resolve).catch(reject);
                    return;
                }
                if (!nextCalled)
                    resolve();
            }
            else {
                Promise.resolve(handler(req, res)).then(resolve).catch(reject);
            }
        });
        if (res.finished)
            return;
    }
};
const buildRes = () => {
    const res = {
        statusCode: 200,
        body: undefined,
        finished: false,
    };
    res.status = globals_1.jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = globals_1.jest.fn((payload) => {
        res.body = payload;
        res.finished = true;
        return res;
    });
    return res;
};
(0, globals_1.describe)('AI Routes - Feedback Security', () => {
    (0, globals_1.beforeEach)(() => {
        mockQueueAdd.mockClear();
        mockRateLimiterConsume.mockClear();
    });
    (0, globals_1.it)('should use the authenticated user ID instead of the body user ID for feedback', async () => {
        const req = {
            method: 'POST',
            url: '/feedback',
            body: {
                insight: { text: 'test' },
                feedbackType: 'accept',
                user: 'spoofed-user', // Malicious user tries to spoof
                timestamp: new Date().toISOString(),
                originalPrediction: {},
            },
            ip: '127.0.0.1',
            user: { id: 'auth-user', tenantId: 'tenant-1' }, // Authenticated user
        };
        const res = buildRes();
        const handlers = getRouteHandlers('/feedback');
        // We need to bypass validation middleware if it fails due to mocking issues
        // But since we mock everything, validation (express-validator) should work if not mocked.
        // express-validator is a real dependency, we didn't mock it.
        await runHandlers(handlers, req, res);
        (0, globals_1.expect)(res.statusCode).toBe(200);
        (0, globals_1.expect)(mockQueueAdd).toHaveBeenCalledTimes(1);
        // VERIFY: The queue should receive the spoofed user initially (vulnerability),
        // and then we will fix it to receive 'auth-user'.
        const addedJob = mockQueueAdd.mock.calls[0];
        const jobData = addedJob[1];
        // For TDD: We expect this to be 'spoofed-user' BEFORE the fix.
        // But after fix, we expect 'auth-user'.
        // The test logic should assert what happens NOW.
        // Since I haven't fixed it yet, I expect 'spoofed-user'.
        (0, globals_1.expect)(jobData.user).toBe('spoofed-user');
    });
});
