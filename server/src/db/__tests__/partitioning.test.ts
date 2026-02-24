
import { describe, it, expect, beforeEach, jest, beforeAll } from '@jest/globals';

// Mock dependencies
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

jest.unstable_mockModule('../postgres.js', () => ({
  getPostgresPool: jest.fn(() => mockPool),
}));

jest.unstable_mockModule('../../services/ColdStorageService.js', () => ({
  coldStorageService: {
    archivePartition: jest.fn(),
  },
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.unstable_mockModule('../../cache/redis.js', () => ({
  RedisService: {
    getInstance: jest.fn(() => ({})),
  },
}));

describe('PartitionManager', () => {
  let PartitionManager: typeof import('../partitioning.js').PartitionManager;
  let getPostgresPool: jest.Mock;
  let coldStorageService: { archivePartition: jest.Mock };
  let partitionManager: InstanceType<typeof PartitionManager>;

  beforeAll(async () => {
    ({ PartitionManager } = await import('../partitioning.js'));
    ({ getPostgresPool } = await import('../postgres.js'));
    ({ coldStorageService } = await import('../../services/ColdStorageService.js'));
  });

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

  describe('createHashPartition', () => {
    it('should create a hash partition', async () => {
      mockQuery.mockImplementation((query: any) => {
        if (typeof query === 'string' && query.includes('SELECT to_regclass')) {
          return Promise.resolve({ rows: [{ to_regclass: null }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await partitionManager.createHashPartition('users', 4, 0);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE users_mod4_rem0'),
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('FOR VALUES WITH (MODULUS 4, REMAINDER 0)'),
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should skip if hash partition exists', async () => {
      mockQuery.mockImplementation((query: any) => {
        if (typeof query === 'string' && query.includes('SELECT to_regclass')) {
          return Promise.resolve({ rows: [{ to_regclass: 'exists' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await partitionManager.createHashPartition('users', 4, 0);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE'),
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('checkPartitionHealth', () => {
    it('should return true if partitions exist', async () => {
      mockQuery.mockImplementation((query: any) => {
        if (typeof query === 'string' && query.includes('SELECT count(*)')) {
          return Promise.resolve({ rows: [{ count: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await partitionManager.checkPartitionHealth('users');
      expect(result).toBe(true);
    });

    it('should return false if no partitions exist', async () => {
      mockQuery.mockImplementation((query: any) => {
        if (typeof query === 'string' && query.includes('SELECT count(*)')) {
          return Promise.resolve({ rows: [{ count: 0 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await partitionManager.checkPartitionHealth('users');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockQuery.mockRejectedValue(new Error('DB Error'));
      const result = await partitionManager.checkPartitionHealth('users');
      expect(result).toBe(false);
    });
  });
});
