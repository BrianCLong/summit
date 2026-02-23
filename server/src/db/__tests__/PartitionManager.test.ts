
import { jest } from '@jest/globals';

const mockPool = {
  connect: jest.fn(),
  write: jest.fn(),
  read: jest.fn(),
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
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
  coldStorageService: {
    archivePartition: jest.fn(),
  },
}));

// Dynamic import
const { partitionManager } = await import('../partitioning.js');

describe('PartitionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [] }); // Default
  });

  describe('createMonthlyPartition', () => {
    it('should create a partition if it does not exist', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ to_regclass: null }] }); // Check existence (null = not exists)
      mockClient.query.mockResolvedValueOnce({}); // CREATE TABLE
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      const date = new Date('2023-01-15T00:00:00Z');
      await partitionManager.createMonthlyPartition('test_table', date);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      // Check for correct partition name logic (UTC)
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('to_regclass'), expect.any(Array));

      // Fix: expect only one argument for CREATE TABLE
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));

      // More specific checks
      const createCall = mockClient.query.mock.calls.find(call => call[0].includes('CREATE TABLE'));
      expect(createCall[0]).toContain('test_table_y2023m01');

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should skip creation if partition exists', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ to_regclass: 'exists' }] }); // Check existence
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      const date = new Date('2023-01-15T00:00:00Z');
      await partitionManager.createMonthlyPartition('test_table', date);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('detachOldPartitions', () => {
      it('should detach and archive old partitions', async () => {
          // Mock fetch partitions result
          mockClient.query.mockImplementation((query) => {
              if (query.includes('SELECT to_regclass')) return Promise.resolve({ rows: [{ to_regclass: 'exists' }] });
              if (query.includes('SELECT inhrelid')) {
                  return Promise.resolve({ rows: [
                      { partition_name: 'test_table_y2020m01' }, // Old
                      { partition_name: 'test_table_y2030m01' }  // Future
                  ]});
              }
              return Promise.resolve({});
          });

          await partitionManager.detachOldPartitions(['test_table'], 12); // Retention 12 months

          const { coldStorageService } = await import('../../services/ColdStorageService.js');

          expect(coldStorageService.archivePartition).toHaveBeenCalledWith('test_table', 'test_table_y2020m01', false, 'GLACIER');
          expect(coldStorageService.archivePartition).not.toHaveBeenCalledWith('test_table', 'test_table_y2030m01', expect.anything(), expect.anything());
      });
  });
});
