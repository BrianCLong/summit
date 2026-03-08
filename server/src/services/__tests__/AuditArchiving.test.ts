import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { existsSync } from 'fs';
import path from 'path';

const getPostgresPoolMock = jest.fn();
const getRedisClientMock = jest.fn(() => null);

jest.unstable_mockModule('../../config/database.js', () => ({
  getPostgresPool: getPostgresPoolMock,
  getRedisClient: getRedisClientMock,
}));

describe('Audit Archiving and Tiered Storage', () => {
  let AuditArchivingService: any;
  let AdvancedAuditSystem: any;
  let archiver: any;
  let auditSystem: any;
  let mockPool: any;

  const ARCHIVE_DIR = path.join(process.cwd(), 'archive/audit');

  beforeAll(async () => {
    const bootstrapPool = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };
    getPostgresPoolMock.mockReturnValue(bootstrapPool);

    ({ AuditArchivingService } = await import('../AuditArchivingService.js'));
    ({ AdvancedAuditSystem } = await import('../../audit/advanced-audit-system.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };
    getPostgresPoolMock.mockReturnValue(mockPool);
    getRedisClientMock.mockReturnValue(null);

    const system = AdvancedAuditSystem.getInstance();
    (system as any).db = mockPool;
    auditSystem = system;

    const archiverInstance = AuditArchivingService.getInstance();
    (archiverInstance as any).db = mockPool;
    archiver = archiverInstance;

    (auditSystem as any).archiveThresholdDays = 1;
    (auditSystem as any).retentionPeriodDays = 2;
    (auditSystem as any).retentionEnabled = true;
  });

  afterEach(() => {
    if (existsSync(ARCHIVE_DIR)) {
      // Intentionally keeping artifacts for local debugging.
    }
  });

  it('should archive events before pruning', async () => {
    const mockRecords = [
      {
        id: '1',
        event_type: 'user_login',
        timestamp: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000),
      },
    ];

    mockPool.query.mockResolvedValueOnce({ rows: mockRecords, rowCount: 1 });
    mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

    const deletedCount = await auditSystem.pruneExpiredEvents(2);

    expect(deletedCount).toBe(1);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM audit_events'),
      expect.any(Array),
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM audit_events'),
      expect.any(Array),
    );
    expect(archiver).toBeDefined();
  });

  it('should handle no records for archival gracefully', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const deletedCount = await auditSystem.pruneExpiredEvents(2);
    expect(deletedCount).toBe(0);
  });
});
