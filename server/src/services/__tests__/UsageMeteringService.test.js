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
const mockPipeline = {
    hset: globals_1.jest.fn(),
    zadd: globals_1.jest.fn(),
    expire: globals_1.jest.fn(),
    exec: globals_1.jest.fn().mockResolvedValue([]),
    hget: globals_1.jest.fn(),
    hgetall: globals_1.jest.fn(),
};
const mockRedis = {
    pipeline: globals_1.jest.fn(() => mockPipeline),
    zrangebyscore: globals_1.jest.fn(),
    zrevrangebyscore: globals_1.jest.fn(),
};
globals_1.jest.unstable_mockModule('../db/redis.js', () => ({
    getRedisClient: globals_1.jest.fn(() => mockRedis),
}));
// Mock logger to avoid clutter
globals_1.jest.unstable_mockModule('../config/logger.js', () => ({
    default: {
        info: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
    },
}));
const { UsageMeteringService } = await Promise.resolve().then(() => __importStar(require('../UsageMeteringService.js')));
(0, globals_1.describe)('UsageMeteringService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        service = new UsageMeteringService();
    });
    (0, globals_1.it)('should record a usage event', async () => {
        const event = {
            id: 'evt1',
            tenantId: 't1',
            dimension: 'api_calls',
            quantity: 1,
            unit: 'calls',
            source: 'api',
            occurredAt: new Date().toISOString(),
            recordedAt: new Date().toISOString(),
        };
        await service.record(event);
        (0, globals_1.expect)(mockRedis.pipeline).toHaveBeenCalled();
        (0, globals_1.expect)(mockPipeline.hset).toHaveBeenCalledWith(`usage:event:${event.id}`, globals_1.expect.objectContaining({
            id: event.id,
            quantity: event.quantity
        }));
        (0, globals_1.expect)(mockPipeline.zadd).toHaveBeenCalled();
        (0, globals_1.expect)(mockPipeline.exec).toHaveBeenCalled();
    });
    (0, globals_1.it)('should aggregate usage', async () => {
        mockRedis.zrangebyscore.mockResolvedValue(['evt1', 'evt2']);
        // Mock hget results
        mockPipeline.exec.mockResolvedValue([
            [null, '10'], // quantity 10
            [null, '20'], // quantity 20
        ]);
        const result = await service.getAggregation('t1', 'api_calls', '2023-01-01', '2023-01-02');
        (0, globals_1.expect)(result.totalQuantity).toBe(30);
        (0, globals_1.expect)(result.eventCount).toBe(2);
        (0, globals_1.expect)(mockRedis.zrangebyscore).toHaveBeenCalledWith('usage:timeline:t1:api_calls', globals_1.expect.any(Number), globals_1.expect.any(Number));
    });
    (0, globals_1.it)('should get events list', async () => {
        mockRedis.zrevrangebyscore.mockResolvedValue(['evt1']);
        mockPipeline.exec.mockResolvedValue([
            [null, { id: 'evt1', quantity: '5', metadata: '{"foo":"bar"}' }]
        ]);
        const events = await service.getEvents('t1', { dimension: 'api_calls' });
        (0, globals_1.expect)(events).toHaveLength(1);
        (0, globals_1.expect)(events[0].id).toBe('evt1');
        (0, globals_1.expect)(events[0].quantity).toBe(5);
        (0, globals_1.expect)(events[0].metadata).toEqual({ foo: 'bar' });
    });
});
