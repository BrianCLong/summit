
import { LogCompactor } from '../log-compactor.js';
import { AdvancedAuditSystem } from '../advanced-audit-system.js';
import { Pool } from 'pg';
import { jest } from '@jest/globals';
import { putLocked } from '../worm.js';

// Mock dependencies
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
} as any;

const mockAuditSystem = {
  queryEvents: jest.fn(),
} as unknown as AdvancedAuditSystem;

jest.mock('../worm.js', () => ({
  putLocked: jest.fn(),
}));

describe('LogCompactor', () => {
  let compactor: LogCompactor;

  beforeEach(() => {
    jest.clearAllMocks();
    compactor = new LogCompactor(mockPool, mockAuditSystem, mockLogger);
  });

  it('should compact logs successfully', async () => {
    const mockLogs = [
      { id: '1', hash: 'h1', timestamp: new Date(), eventType: 'test' },
      { id: '2', hash: 'h2', timestamp: new Date(), eventType: 'test' },
    ];

    (mockAuditSystem.queryEvents as any).mockResolvedValueOnce(mockLogs);
    (putLocked as any).mockResolvedValueOnce('s3://bucket/key');
    (mockPool.query as any).mockResolvedValueOnce({ rowCount: 1 });

    const root = await compactor.compactLogs(new Date(), 'test-bucket');

    expect(root).toBeDefined();
    expect(putLocked).toHaveBeenCalled();
    expect(mockPool.query).toHaveBeenCalled(); // Insert root
  });

  it('should handle empty logs', async () => {
    (mockAuditSystem.queryEvents as any).mockResolvedValueOnce([]);

    const root = await compactor.compactLogs(new Date(), 'test-bucket');

    expect(root).toBe('');
    expect(putLocked).not.toHaveBeenCalled();
  });
});
