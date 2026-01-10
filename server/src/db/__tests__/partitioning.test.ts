
import { PartitionManager } from '../partitioning.js';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getPostgresPool } from '../postgres.js';
import { coldStorageService } from '../../services/ColdStorageService.js';

// Mock dependencies
jest.mock('../postgres.js');
jest.mock('../../services/ColdStorageService.js');
jest.mock('../../utils/logger.js');

const mockQuery = jest.fn() as jest.MockedFunction<
  (...args: any[]) => Promise<{ rows: any[] }>
>;
const mockClient = {
  query: mockQuery,
  release: jest.fn(),
};

const mockPool = {
  connect: jest.fn(() => Promise.resolve(mockClient)) as jest.MockedFunction<
    () => Promise<typeof mockClient>
  >,
};

(getPostgresPool as any).mockReturnValue(mockPool);

describe('PartitionManager', () => {
  let partitionManager: PartitionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    (getPostgresPool as jest.Mock).mockReturnValue(mockPool);
    mockPool.connect.mockResolvedValue(mockClient);
    partitionManager = new PartitionManager();
  });

  describe('createTenantPartition', () => {
    it('should create a partition if it does not exist', async () => {
      mockQuery.mockImplementation((query: any) => {
        if (typeof query === 'string' && query.includes('SELECT to_regclass')) {
          return Promise.resolve({ rows: [{ to_regclass: null }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await partitionManager.createTenantPartition('tenant-1');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE maestro_runs_tenant1'));
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should skip creation if partition exists', async () => {
      mockQuery.mockImplementation((query: any) => {
        if (typeof query === 'string' && query.includes('SELECT to_regclass')) {
          return Promise.resolve({ rows: [{ to_regclass: 'exists' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await partitionManager.createTenantPartition('tenant-1');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('detachOldPartitions', () => {
    it('should detach and archive old partitions', async () => {
      const now = new Date();
      const oldDate = new Date(now.getFullYear(), now.getMonth() - 13, 1);
      const newDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const formatName = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `audit_logs_y${year}m${month}`;
      };
      const oldPartition = formatName(oldDate);
      const newPartition = formatName(newDate);

      // Mock finding partitions
      mockQuery.mockImplementation((query: any) => {
        if (typeof query === 'string' && query.includes('SELECT inhrelid')) {
            return Promise.resolve({
                rows: [
                    { partition_name: oldPartition },
                    { partition_name: newPartition }
                ]
            });
        }
        return Promise.resolve({ rows: [] });
      });

      await partitionManager.detachOldPartitions(['audit_logs'], 12);

      // Should detach/archve older partition
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining(`DETACH PARTITION ${oldPartition}`),
      );
      expect(coldStorageService.archivePartition).toHaveBeenCalledWith(
        'audit_logs',
        oldPartition,
        true,
      );

      // Should NOT detach newer partition
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining(`DETACH PARTITION ${newPartition}`),
      );
    });
  });
});
