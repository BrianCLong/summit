import { jest, describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { existsSync } from 'fs';
import path from 'path';

const getPostgresPoolMock = jest.fn();

jest.unstable_mockModule('../../config/database.js', () => ({
  getPostgresPool: getPostgresPoolMock,
  getRedisClient: jest.fn(() => null),
}));

describe('Audit Archiving and Tiered Storage', () => {
  let AuditArchivingService: typeof import('../AuditArchivingService.js').AuditArchivingService;
  let AdvancedAuditSystem: typeof import('../../audit/advanced-audit-system.js').AdvancedAuditSystem;
  let archiver: InstanceType<typeof AuditArchivingService>;
  let auditSystem: any;
  let mockPool: any;

  const ARCHIVE_DIR = path.join(process.cwd(), 'archive/audit');

  beforeAll(async () => {
    ({ AuditArchivingService } = await import('../AuditArchivingService.js'));
    ({ AdvancedAuditSystem } = await import('../../audit/advanced-audit-system.js'));
  });

  beforeEach(() => {
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };
    getPostgresPoolMock.mockReturnValue(mockPool);

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
      // Intentionally keep artifacts for debugging in test environments.
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
  });

  it('should handle no records for archival gracefully', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const deletedCount = await auditSystem.pruneExpiredEvents(2);
    expect(deletedCount).toBe(0);
  });
});
