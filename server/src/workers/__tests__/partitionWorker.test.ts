
import { jest } from '@jest/globals';

// Mock dependencies
const mockMaintainPartitions = jest.fn().mockResolvedValue(undefined);
const mockDetachOldPartitions = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../../db/partitioning.js', () => ({
  partitionManager: {
    maintainPartitions: mockMaintainPartitions,
    detachOldPartitions: mockDetachOldPartitions
  }
}));

const { runPartitionMaintenance, startPartitionWorker, stopPartitionWorker } = await import('../partitionWorker.js');

describe('Partition Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ENABLE_PARTITION_WORKER = 'true';
    jest.useFakeTimers();
  });

  afterEach(() => {
    stopPartitionWorker();
    jest.useRealTimers();
  });

  it('should run maintenance logic correctly', async () => {
    await runPartitionMaintenance();

    expect(mockMaintainPartitions).toHaveBeenCalledWith(
        expect.arrayContaining(['audit_logs', 'metrics', 'risk_signals', 'evidence_bundles'])
    );
    expect(mockDetachOldPartitions).toHaveBeenCalledWith(
        expect.arrayContaining(['audit_logs', 'metrics']),
        expect.any(Number)
    );
  });

  it('should not start if disabled', () => {
    process.env.ENABLE_PARTITION_WORKER = 'false';
    startPartitionWorker();
    expect(mockMaintainPartitions).not.toHaveBeenCalled();
  });

  it('should schedule periodic runs', () => {
    startPartitionWorker();
    // Initial run
    expect(mockMaintainPartitions).toHaveBeenCalledTimes(1);

    // Fast forward time
    jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(mockMaintainPartitions).toHaveBeenCalledTimes(2);
  });
});
