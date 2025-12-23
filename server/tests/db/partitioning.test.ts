
import { jest } from '@jest/globals';
import { PartitionManager } from '../../src/db/partitioning.js';

// Mock dependencies
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn().mockResolvedValue({
  query: mockQuery,
  release: mockRelease,
});

jest.mock('../../src/db/postgres.js', () => ({
  getPostgresPool: () => ({
    connect: mockConnect,
  }),
}));

jest.mock('../../src/utils/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('PartitionManager', () => {
  let partitionManager: PartitionManager;

  beforeEach(() => {
    partitionManager = new PartitionManager();
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockClear();
  });

  describe('createTenantPartition', () => {
    it('should create a partition if it does not exist', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ to_regclass: null }] }) // Check existence
        .mockResolvedValueOnce({}) // CREATE TABLE
        .mockResolvedValueOnce({}); // COMMIT

      await partitionManager.createTenantPartition('tenant-123');

      expect(mockConnect).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT to_regclass'), expect.any(Array));
      expect(mockQuery).toHaveBeenNthCalledWith(3, expect.stringContaining('CREATE TABLE maestro_runs_tenant123'));
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should skip creation if partition exists', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ to_regclass: 'maestro_runs_tenant123' }] }) // Check existence
        .mockResolvedValueOnce({}); // COMMIT

      await partitionManager.createTenantPartition('tenant-123');

      expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('createMonthlyPartition', () => {
    it('should create a monthly range partition', async () => {
        const date = new Date('2024-01-15');

        mockQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ to_regclass: null }] }) // Check existence
            .mockResolvedValueOnce({}) // CREATE TABLE
            .mockResolvedValueOnce({}); // COMMIT

        await partitionManager.createMonthlyPartition('audit_logs', date);

        // Expected name: audit_logs_y2024m01
        // Expected range: 2024-01-01 to 2024-02-01

        expect(mockQuery).toHaveBeenNthCalledWith(3, expect.stringContaining('CREATE TABLE audit_logs_y2024m01'));
        expect(mockQuery).toHaveBeenNthCalledWith(3, expect.stringContaining("FROM ('2024-01-01') TO ('2024-02-01')"));
    });

    it('should handle year rollover correctly', async () => {
        const date = new Date('2024-12-15');

        mockQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ to_regclass: null }] }) // Check existence
            .mockResolvedValueOnce({}) // CREATE TABLE
            .mockResolvedValueOnce({}); // COMMIT

        await partitionManager.createMonthlyPartition('audit_logs', date);

        // Expected name: audit_logs_y2024m12
        // Expected range: 2024-12-01 to 2025-01-01
        expect(mockQuery).toHaveBeenNthCalledWith(3, expect.stringContaining('CREATE TABLE audit_logs_y2024m12'));
        expect(mockQuery).toHaveBeenNthCalledWith(3, expect.stringContaining("FROM ('2024-12-01') TO ('2025-01-01')"));
    });
  });

  describe('ensureFuturePartitions', () => {
      it('should create partitions for N months ahead', async () => {
          mockQuery.mockResolvedValue({ rows: [{ to_regclass: 'existing' }] }); // Assume exists to simplify mock

          await partitionManager.ensureFuturePartitions('audit_logs', 2);

          // Should call createMonthlyPartition 3 times (current month + 2 ahead)
          // 0, 1, 2
          expect(mockConnect).toHaveBeenCalledTimes(3);
      });
  });
});
