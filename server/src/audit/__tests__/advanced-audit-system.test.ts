import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { AdvancedAuditSystem } from '../advanced-audit-system.ts';

jest.mock('../../config/database.ts', () => ({
  getPostgresPool: jest.fn(() => null),
  getRedisClient: jest.fn(() => null),
}));

const buildLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

describe('AdvancedAuditSystem', () => {
  beforeEach(() => {
    process.env.AUDIT_RETENTION_SCHEDULE_ENABLED = 'false';
  });

  it('flushes audit events to the database', async () => {
    const db = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    } as any;
    const redis = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as any;
    const logger = buildLogger();

    const system = AdvancedAuditSystem.createForTest({
      db,
      redis,
      logger,
    });

    await system.recordEvent({
      eventType: 'user_action',
      level: 'info',
      correlationId: 'corr-123',
      tenantId: 'tenant-1',
      serviceId: 'realtime',
      action: 'comment.added',
      outcome: 'success',
      message: 'Comment added',
      details: { commentId: 'comment-1' },
      complianceRelevant: true,
      complianceFrameworks: [],
      userId: 'user-1',
    });

    const insertCall = (db.query as jest.Mock).mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO audit_events'),
    );

    expect(insertCall).toBeDefined();

    await system.shutdown();
  });

  it('prunes audit events based on retention policy', async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 7 }),
    } as any;
    const logger = buildLogger();

    const system = AdvancedAuditSystem.createForTest({
      db,
      redis: null,
      logger,
    });

    const deleted = await system.pruneExpiredEvents(30);

    expect(deleted).toBe(7);
    const deleteCall = (db.query as jest.Mock).mock.calls.find(([sql]) =>
      String(sql).includes('DELETE FROM audit_events'),
    );
    expect(deleteCall).toBeDefined();

    await system.shutdown();
  });
});
