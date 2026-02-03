
import { jest } from '@jest/globals';

const mockQuery = jest.fn().mockResolvedValue({ rows: [{ id: 1, name: 'test' }], rowCount: 1 });
const mockPool = {
    query: mockQuery,
    connect: jest.fn(),
    end: jest.fn()
};
const mockPoolConstructor = jest.fn(() => mockPool);

jest.unstable_mockModule('pg', () => ({
    Pool: mockPoolConstructor
}));

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisService = {
    get: mockRedisGet,
    set: mockRedisSet
};

jest.unstable_mockModule('../../cache/redis.js', () => ({
    RedisService: {
        getInstance: () => mockRedisService
    }
}));

// Mock other dependencies of pg.ts
jest.unstable_mockModule('@opentelemetry/api', () => ({
    trace: {
        getTracer: () => ({
            startActiveSpan: (name, cb) => cb({
                setAttributes: jest.fn(),
                recordException: jest.fn(),
                setStatus: jest.fn(),
                end: jest.fn()
            })
        })
    }
}));
const mockCounterInstance = { inc: jest.fn(), labels: jest.fn().mockReturnThis() };
const mockHistogramInstance = { observe: jest.fn(), labels: jest.fn().mockReturnThis() };

jest.unstable_mockModule('prom-client', () => ({
    Counter: jest.fn(() => mockCounterInstance),
    Histogram: jest.fn(() => mockHistogramInstance),
    register: { getSingleMetric: jest.fn() }
}));

const { pg } = await import('../pg.js');

describe('pg caching', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
