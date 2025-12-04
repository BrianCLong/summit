import { AdvancedAuditSystem } from '../../audit/advanced-audit-system';
import { Pool } from 'pg';
import Redis from 'ioredis';
import pino from 'pino';

// Mock dependencies
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

const mockRedis = {
  publish: jest.fn(),
} as unknown as Redis;

const mockLogger = pino({ level: 'silent' });

describe('AdvancedAuditSystem', () => {
  let auditSystem: AdvancedAuditSystem;
  const signingKey = 'test-signing-key';
  const encryptionKey = 'test-encryption-key';

  beforeEach(() => {
    jest.clearAllMocks();
    auditSystem = new AdvancedAuditSystem(
      mockPool,
      mockRedis,
      mockLogger,
      signingKey,
      encryptionKey
    );
  });

  afterEach(async () => {
    // Manually stop intervals to prevent open handles
    // Access private properties via casting to any if needed, or rely on gracefulShutdown
    // But since gracefulShutdown uses logger and internal state, we can just let it be GC'd or call shutdown
    await (auditSystem as any).gracefulShutdown();
  });

  it('should initialize schema on startup', () => {
    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS audit_events'));
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
        eventType: 'user_login' as const
    };

    // In non-prod it warns but returns empty string or throws depending on config.
    // The code currently catches error and logs it, returning ''
    const eventId = await auditSystem.recordEvent(invalidEvent as any);
    expect(eventId).toBe('');
  });

  it('should query events', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 'event-1',
          event_type: 'user_login',
          timestamp: new Date(),
          // ... other fields mapped by deserializeEvent
        }
      ]
    });

    const events = await auditSystem.queryEvents({
      userIds: ['user-123']
    });

    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM audit_events'), expect.arrayContaining([['user-123']]));
    expect(events).toHaveLength(1);
  });
});
