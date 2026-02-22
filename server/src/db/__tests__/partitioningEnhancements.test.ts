
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

const mockGetPostgresPool = jest.fn();
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
};

jest.unstable_mockModule('../postgres.js', () => ({
    getPostgresPool: mockGetPostgresPool,
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
    default: mockLogger,
}));

jest.unstable_mockModule('../../cache/redis.js', () => ({
    RedisService: {
        getInstance: jest.fn(() => ({})),
    },
}));

jest.unstable_mockModule('../../services/ColdStorageService.js', () => ({
    coldStorageService: {},
}));

// Dynamic imports
const { PartitionManager } = await import('../partitioning.js');

describe('PartitionManager Enhancements', () => {
    let partitionManager: any;
    let mockClient: any;
    let mockPool: any;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockClient = {
            query: jest.fn(),
            release: jest.fn(),
        };

        mockPool = {
            connect: jest.fn().mockResolvedValue(mockClient),
        };

        mockGetPostgresPool.mockReturnValue(mockPool);

        partitionManager = new PartitionManager();
    });

    it('should create a list partition correctly', async () => {
        // Setup mock responses
        mockClient.query
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ to_regclass: null }] }) // Check partition exists
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }) // Check parent exists
            .mockResolvedValueOnce({}) // CREATE TABLE
            .mockResolvedValueOnce({}); // COMMIT

        await partitionManager.createListPartition('test_table', 'test_part_1', ['val1', 'val2']);

        expect(mockClient.query).toHaveBeenCalledTimes(5);
        // Verify CREATE SQL
        const createSql = mockClient.query.mock.calls[3][0];
        // Normalize whitespace for check
        const normalizedSql = createSql.replace(/\s+/g, ' ').trim();
        expect(normalizedSql).toContain('CREATE TABLE test_part_1');
        expect(normalizedSql).toContain('PARTITION OF test_table');
        expect(normalizedSql).toContain("FOR VALUES IN ('val1', 'val2')");
    });

    it('should skip creation if parent table does not exist', async () => {
        mockClient.query
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ to_regclass: null }] }) // Check partition exists
            .mockRejectedValueOnce({ code: '42P01' }); // Check parent -> Error 42P01

        await partitionManager.createListPartition('missing_table', 'part_1', ['val']);

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Parent table missing_table does not exist'));
    });

    it('should verify partitioning setup', async () => {
        // 1. Check relkind -> 'p' (partitioned)
        mockClient.query.mockResolvedValueOnce({ rows: [{ relkind: 'p' }] });

        await partitionManager.ensurePartitioningSetup('test_table', 'LIST');

        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('correctly partitioned'));
    });
});
