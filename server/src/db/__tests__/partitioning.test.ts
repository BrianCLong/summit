
import { jest } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockClient = {
  query: mockQuery,
  release: jest.fn(),
};
const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  read: jest.fn(),
  write: jest.fn(),
};

jest.unstable_mockModule('../postgres.js', () => ({
  getPostgresPool: () => mockPool,
}));

jest.unstable_mockModule('../../cache/redis.js', () => ({
  RedisService: {
    getInstance: () => ({}),
  },
}));

jest.unstable_mockModule('../../services/ColdStorageService.js', () => ({
  coldStorageService: {},
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const { PartitionManager } = await import('../partitioning.js');

describe('PartitionManager', () => {
  let partitionManager: PartitionManager;

  beforeEach(() => {
    partitionManager = new PartitionManager();
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('createMonthlyPartition', () => {
    it('should create a monthly partition if it does not exist', async () => {
      // Mock BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock partition check returning null (not exists)
      mockQuery.mockResolvedValueOnce({ rows: [{ to_regclass: null }] });
      // Mock creation success
      mockQuery.mockResolvedValueOnce({ rows: [] }); // create table
      // Mock COMMIT
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const date = new Date('2023-01-15');
      await partitionManager.createMonthlyPartition('test_table', date);

      // Verify check query (2nd call)
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT to_regclass'), expect.arrayContaining(['test_table_y2023m01']));

      // Verify create query (3rd call)
      expect(mockQuery).toHaveBeenNthCalledWith(3, expect.stringContaining('CREATE TABLE test_table_y2023m01'));
      expect(mockQuery).toHaveBeenNthCalledWith(3, expect.stringContaining("FOR VALUES FROM ('2023-01-01') TO ('2023-02-01')"));
    });

    it('should skip creation if partition exists', async () => {
      // Mock BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock partition check returning 'exists'
      mockQuery.mockResolvedValueOnce({ rows: [{ to_regclass: 'test_table_y2023m01' }] });
      // Mock COMMIT
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const date = new Date('2023-01-15');
      await partitionManager.createMonthlyPartition('test_table', date);

      expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));
    });

    it('should support YYYY_MM suffix format', async () => {
      // Mock BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ to_regclass: null }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const date = new Date('2023-01-15');
      // Table name with _p, expected to strip it
      await partitionManager.createMonthlyPartition('events_p', date, 'YYYY_MM');

      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT to_regclass'), expect.arrayContaining(['events_2023_01']));
      expect(mockQuery).toHaveBeenNthCalledWith(3, expect.stringContaining('CREATE TABLE events_2023_01'));
    });
  });
});
