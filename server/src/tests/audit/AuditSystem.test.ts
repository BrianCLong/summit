import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import Redis from 'ioredis';
import pino from 'pino';

type AdvancedAuditSystem =
  import('../../audit/advanced-audit-system.js').AdvancedAuditSystem;

// Mock dependencies
const mockQuery = jest.fn() as jest.MockedFunction<
  (...args: any[]) => Promise<{ rows: any[] }>
>;
const mockPool = {
  query: mockQuery,
} as unknown as Pool;

const mockRedis = {
  publish: jest.fn(),
} as unknown as Redis;

const mockLogger = (pino as any)({ level: 'silent' });

describe('AdvancedAuditSystem', () => {
  let auditSystem: AdvancedAuditSystem;
  const signingKey = 'test-signing-key';
  const encryptionKey = 'test-encryption-key';
  const { AdvancedAuditSystem } = jest.requireActual(
    '../../audit/advanced-audit-system.js',
  ) as typeof import('../../audit/advanced-audit-system.js');

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] } as any);
    auditSystem = AdvancedAuditSystem.createForTest({
      db: mockPool,
      redis: mockRedis,
      logger: mockLogger,
      signingKey,
      encryptionKey,
    });
  });

  afterEach(async () => {
    await auditSystem.shutdown();
  });

  it('should initialize schema on startup', async () => {
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS audit_events'),
    );
  });

  it('should record an audit event successfully', async () => {
    const eventData = {
      eventType: 'user_login' as const,
      action: 'login',
      outcome: 'success' as const,
      userId: 'user-123',
      tenantId: 'tenant-1',
      serviceId: 'auth-service',
      message: 'User logged in',
      level: 'info' as const,
      details: {},
      complianceRelevant: true,
      complianceFrameworks: ['SOC2' as const],
    };

    const eventId = await auditSystem.recordEvent(eventData);

    expect(eventId).toBeDefined();
    expect(typeof eventId).toBe('string');
    // Flush happens immediately for compliance relevant events
    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_events'), expect.any(Array));
  });

  it('should validate event data', async () => {
    const invalidEvent = {
      // Missing required fields
      eventType: 'user_login' as const,
    };

    await expect(auditSystem.recordEvent(invalidEvent as any)).rejects.toThrow(
      /Invalid audit event/,
    );
  });

  it('should query events', async () => {
    mockQuery.mockImplementation((query: any) => {
      if (typeof query === 'string' && query.includes('SELECT * FROM audit_events')) {
        return Promise.resolve({
          rows: [
            {
              id: 'event-1',
              event_type: 'user_login',
              timestamp: new Date(),
              // ... other fields mapped by deserializeEvent
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const events = await auditSystem.queryEvents({
      userIds: ['user-123']
    });

    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM audit_events'), expect.arrayContaining([['user-123']]));
    expect(events).toHaveLength(1);
  });
});
