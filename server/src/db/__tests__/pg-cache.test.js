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
const mockQuery = globals_1.jest.fn().mockResolvedValue({ rows: [{ id: 1, name: 'test' }], rowCount: 1 });
const mockPool = {
    query: mockQuery,
    connect: globals_1.jest.fn(),
    end: globals_1.jest.fn()
};
const mockPoolConstructor = globals_1.jest.fn(() => mockPool);
globals_1.jest.unstable_mockModule('pg', () => ({
    Pool: mockPoolConstructor
}));
const mockRedisGet = globals_1.jest.fn();
const mockRedisSet = globals_1.jest.fn();
const mockRedisService = {
    get: mockRedisGet,
    set: mockRedisSet
};
globals_1.jest.unstable_mockModule('../../cache/redis.js', () => ({
    RedisService: {
        getInstance: () => mockRedisService
    }
}));
// Mock other dependencies of pg.ts
globals_1.jest.unstable_mockModule('@opentelemetry/api', () => ({
    trace: {
        getTracer: () => ({
            startActiveSpan: (name, cb) => cb({
                setAttributes: globals_1.jest.fn(),
                recordException: globals_1.jest.fn(),
                setStatus: globals_1.jest.fn(),
                end: globals_1.jest.fn()
            })
        })
    }
}));
const mockCounterInstance = { inc: globals_1.jest.fn(), labels: globals_1.jest.fn().mockReturnThis() };
const mockHistogramInstance = { observe: globals_1.jest.fn(), labels: globals_1.jest.fn().mockReturnThis() };
globals_1.jest.unstable_mockModule('prom-client', () => ({
    Counter: globals_1.jest.fn(() => mockCounterInstance),
    Histogram: globals_1.jest.fn(() => mockHistogramInstance),
    register: { getSingleMetric: globals_1.jest.fn() }
}));
const { pg } = await Promise.resolve().then(() => __importStar(require('../pg.js')));
describe('pg caching', () => {
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
    });
    it('should check cache and return cached value', async () => {
        mockRedisGet.mockResolvedValue(JSON.stringify({ id: 99, name: 'cached' }));
        const result = await pg.read('SELECT * FROM users', [], { cache: { ttl: 60, key: 'test-key' } });
        expect(mockRedisGet).toHaveBeenCalledWith('test-key');
        expect(result).toEqual({ id: 99, name: 'cached' });
        // Since we are mocking RedisService separately from pg.ts implementation logic (which we are not, we are testing pg.ts),
        // we need to ensure that _executeQuery is not called?
        // Wait, pg.read calls _executeQuery. But cache check happens BEFORE.
        // If cache hit, it returns immediately.
        // But the pools are instantiated at module level. _executeQuery uses them.
        // We mocked Pool constructor.
        expect(mockQuery).not.toHaveBeenCalled();
    });
    it('should query db and set cache on miss', async () => {
        mockRedisGet.mockResolvedValue(null);
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'db' }], rowCount: 1 });
        const result = await pg.read('SELECT * FROM users', [], { cache: { ttl: 60, key: 'test-key' } });
        expect(mockRedisGet).toHaveBeenCalledWith('test-key');
        // _executeQuery should be called, which calls pool.query
        expect(mockQuery).toHaveBeenCalled();
        expect(result).toEqual({ id: 1, name: 'db' });
        expect(mockRedisSet).toHaveBeenCalledWith('test-key', JSON.stringify({ id: 1, name: 'db' }), 60);
    });
});
