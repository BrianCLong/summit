
import { PartitionManager } from '../partitioning.js';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getPostgresPool } from '../postgres.js';
import { coldStorageService } from '../../services/ColdStorageService.js';

// Mock dependencies
jest.mock('../postgres.js');
jest.mock('../../services/ColdStorageService.js');
jest.mock('../../utils/logger.js');

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
};

(getPostgresPool as any).mockReturnValue(mockPool);

describe('PartitionManager', () => {
  let partitionManager: PartitionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    partitionManager = new PartitionManager();
  });

  describe('createTenantPartition', () => {
    it('should create a partition if it does not exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ to_regclass: null }] } as any); // Check

      await partitionManager.createTenantPartition('tenant-1');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE maestro_runs_tenant1'));
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should skip creation if partition exists', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ to_regclass: 'exists' }] } as any); // Check

      await partitionManager.createTenantPartition('tenant-1');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('detachOldPartitions', () => {
    it('should detach and archive old partitions', async () => {
      // Mock finding partitions
      mockClient.query.mockImplementation((query, params) => {
        if (typeof query === 'string' && query.includes('SELECT inhrelid')) {
            return Promise.resolve({
                rows: [
                    { partition_name: 'audit_logs_y2020m01' }, // Old
                    { partition_name: 'audit_logs_y2025m01' }  // New (future)
                ]
            });
        }
        return Promise.resolve({ rows: [] });
      });

      await partitionManager.detachOldPartitions(['audit_logs'], 12);

      // Should detach 2020
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('DETACH PARTITION audit_logs_y2020m01'));
      // Should archive 2020
      expect(coldStorageService.archivePartition).toHaveBeenCalledWith('audit_logs', 'audit_logs_y2020m01', true);

      // Should NOT detach 2025
      expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('DETACH PARTITION audit_logs_y2025m01'));
    });
  });
});
