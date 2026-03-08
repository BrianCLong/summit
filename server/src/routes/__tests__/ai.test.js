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
const mockQueueGetJob = globals_1.jest.fn();
const mockRateLimiterConsume = globals_1.jest.fn(async () => ({
    allowed: true,
    total: 1,
    remaining: 1,
    reset: Date.now(),
}));
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('bullmq', () => ({
    Queue: globals_1.jest.fn(() => ({
        add: mockQueueAdd,
        getJob: mockQueueGetJob,
    })),
    Worker: globals_1.jest.fn(() => ({
        on: globals_1.jest.fn(),
    })),
    QueueScheduler: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule('../../ai/ExtractionEngine', () => ({
    ExtractionEngine: globals_1.jest.fn(() => ({
        processExtraction: globals_1.jest.fn(),
    })),
}));
globals_1.jest.unstable_mockModule('../../db/redis', () => ({
    getRedisClient: globals_1.jest.fn(() => ({
        on: globals_1.jest.fn(),
        ping: globals_1.jest.fn(),
    })),
}));
globals_1.jest.unstable_mockModule('../../db/neo4j', () => ({
    getNeo4jDriver: globals_1.jest.fn(() => ({
        session: globals_1.jest.fn(() => ({
            run: globals_1.jest.fn(),
            close: globals_1.jest.fn(),
        })),
    })),
}));
globals_1.jest.unstable_mockModule('../../middleware/auth', () => ({
    requirePermission: () => (_req, _res, next) => next(),
}));
globals_1.jest.unstable_mockModule('../../middleware/rateLimit', () => ({
    createRateLimiter: () => (_req, _res, next) => next(),
    EndpointClass: { AI: 'AI' },
}));
globals_1.jest.unstable_mockModule('../../services/RateLimiter', () => ({
    rateLimiter: {
        consume: mockRateLimiterConsume,
    },
}));
// Dynamic imports AFTER mocks are set up
const { Queue, Worker } = await Promise.resolve().then(() => __importStar(require('bullmq')));
const aiRouter = (await Promise.resolve().then(() => __importStar(require('../ai.js')))).default;
const { rateLimiter } = await Promise.resolve().then(() => __importStar(require('../../services/RateLimiter.js')));
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
(0, globals_1.describe)('AI Routes - Video Analysis', () => {
    (0, globals_1.beforeEach)(() => {
        mockQueueAdd.mockClear();
        mockQueueGetJob.mockClear();
        mockRateLimiterConsume.mockClear();
    });
    (0, globals_1.describe)('POST /api/ai/extract-video', () => {
        (0, globals_1.it)('should submit a video extraction job successfully', async () => {
            mockQueueAdd.mockResolvedValueOnce({ id: 'test-job-id' });
            const req = {
                method: 'POST',
                url: '/extract-video',
                body: {
                    mediaPath: '/path/to/video.mp4',
                    mediaType: 'VIDEO',
                    extractionMethods: ['video_analysis'],
                    options: { frameRate: 1 },
                },
                ip: '127.0.0.1',
                user: { id: 'user-1' },
            };
            const res = buildRes();
            const handlers = getRouteHandlers('/extract-video');
            (0, globals_1.expect)(handlers.length).toBeGreaterThan(1);
            await runHandlers(handlers, req, res);
            (0, globals_1.expect)(res.statusCode).toBe(202);
            (0, globals_1.expect)(res.body.success).toBe(true);
            (0, globals_1.expect)(res.body).toHaveProperty('jobId');
            (0, globals_1.expect)(res.body.message).toContain('job submitted successfully');
            (0, globals_1.expect)(mockQueueAdd).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockQueueAdd).toHaveBeenCalledWith('video-analysis-job', globals_1.expect.objectContaining({ mediaPath: '/path/to/video.mp4' }), globals_1.expect.objectContaining({ jobId: globals_1.expect.any(String) }));
        });
        (0, globals_1.it)('should return 400 if mediaPath is missing', async () => {
            const req = {
                method: 'POST',
                url: '/extract-video',
                body: {
                    mediaType: 'VIDEO',
                    extractionMethods: ['video_analysis'],
                },
                ip: '127.0.0.1',
                user: { id: 'user-1' },
            };
            const res = buildRes();
            const handlers = getRouteHandlers('/extract-video');
            await runHandlers(handlers, req, res);
            (0, globals_1.expect)(res.statusCode).toBe(400);
            (0, globals_1.expect)(res.body.error).toBe('Validation failed');
            (0, globals_1.expect)(res.body.details[0].msg).toMatch(/mediaPath is required|Invalid value/);
        });
        (0, globals_1.it)('should return 400 if mediaType is not VIDEO', async () => {
            const req = {
                method: 'POST',
                url: '/extract-video',
                body: {
                    mediaPath: '/path/to/image.jpg',
                    mediaType: 'IMAGE',
                    extractionMethods: ['video_analysis'],
                },
                ip: '127.0.0.1',
                user: { id: 'user-1' },
            };
            const res = buildRes();
            const handlers = getRouteHandlers('/extract-video');
            await runHandlers(handlers, req, res);
            (0, globals_1.expect)(res.statusCode).toBe(400);
            (0, globals_1.expect)(res.body.error).toBe('Validation failed');
            (0, globals_1.expect)(res.body.details[0].msg).toBe('mediaType must be VIDEO');
        });
    });
    (0, globals_1.describe)('GET /api/ai/job-status/:jobId', () => {
        (0, globals_1.it)('should return job status for a completed job', async () => {
            mockQueueGetJob.mockResolvedValueOnce({
                id: 'completed-job',
                getState: globals_1.jest.fn(async () => 'completed'),
                returnvalue: { status: 'completed', results: [] },
                progress: 100,
                timestamp: Date.now() - 10000,
                finishedOn: Date.now(),
            });
            const req = {
                method: 'GET',
                url: '/job-status/completed-job',
                params: { jobId: 'completed-job' },
                ip: '127.0.0.1',
                user: { id: 'user-1' },
            };
            const res = buildRes();
            const handlers = getRouteHandlers('/job-status/:jobId');
            const handler = handlers[0];
            await handler(req, res);
            (0, globals_1.expect)(mockQueueGetJob).toHaveBeenCalledWith('completed-job');
            (0, globals_1.expect)(res.statusCode).toBe(200);
            (0, globals_1.expect)(res.json).toHaveBeenCalled();
            const payload = res.json.mock.calls.find((call) => call[0])?.[0];
            (0, globals_1.expect)(payload).toBeDefined();
            (0, globals_1.expect)(payload.success).toBe(true);
            (0, globals_1.expect)(payload.jobId).toBe('completed-job');
            (0, globals_1.expect)(payload.status).toBe('completed');
            (0, globals_1.expect)(payload).toHaveProperty('result');
            (0, globals_1.expect)(payload.error).toBeUndefined();
        });
        (0, globals_1.it)('should return job status for a failed job', async () => {
            mockQueueGetJob.mockResolvedValueOnce({
                id: 'failed-job',
                getState: globals_1.jest.fn(async () => 'failed'),
                returnvalue: undefined,
                progress: 50,
                failedReason: 'Something went wrong',
                timestamp: Date.now() - 5000,
                finishedOn: Date.now(),
            });
            const req = {
                method: 'GET',
                url: '/job-status/failed-job',
                params: { jobId: 'failed-job' },
                ip: '127.0.0.1',
                user: { id: 'user-1' },
            };
            const res = buildRes();
            const handlers = getRouteHandlers('/job-status/:jobId');
            const handler = handlers[0];
            await handler(req, res);
            (0, globals_1.expect)(mockQueueGetJob).toHaveBeenCalledWith('failed-job');
            (0, globals_1.expect)(res.statusCode).toBe(200);
            (0, globals_1.expect)(res.json).toHaveBeenCalled();
            const payload = res.json.mock.calls.find((call) => call[0])?.[0];
            (0, globals_1.expect)(payload).toBeDefined();
            (0, globals_1.expect)(payload.success).toBe(true);
            (0, globals_1.expect)(payload.jobId).toBe('failed-job');
            (0, globals_1.expect)(payload.status).toBe('failed');
            (0, globals_1.expect)(payload.result).toBeUndefined();
            (0, globals_1.expect)(payload.error).toBe('Something went wrong');
        });
        (0, globals_1.it)('should return 404 if job is not found', async () => {
            mockQueueGetJob.mockResolvedValueOnce(null);
            const req = {
                method: 'GET',
                url: '/job-status/non-existent-job',
                params: { jobId: 'non-existent-job' },
                ip: '127.0.0.1',
                user: { id: 'user-1' },
            };
            const res = buildRes();
            const handlers = getRouteHandlers('/job-status/:jobId');
            const handler = handlers[0];
            await handler(req, res);
            (0, globals_1.expect)(res.statusCode).toBe(404);
            (0, globals_1.expect)(res.body.error).toBe('Job not found');
        });
    });
});
