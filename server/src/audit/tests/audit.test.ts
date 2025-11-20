
import { AdvancedAuditSystem, AuditEvent, ComplianceFramework } from '../advanced-audit-system.js';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { jest } from '@jest/globals';

// Mock dependencies
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

const mockRedis = {
  publish: jest.fn(),
} as unknown as Redis;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any;

describe('AdvancedAuditSystem', () => {
  let auditSystem: AdvancedAuditSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    auditSystem = new AdvancedAuditSystem(
      mockPool,
      mockRedis,
      mockLogger,
      'test-signing-key',
      'test-encryption-key'
    );
  });

  afterEach(() => {
    // @ts-ignore
    clearInterval(auditSystem.flushInterval);
  });

  it('should record an event successfully', async () => {
    const eventData = {
      eventType: 'user_login' as const,
      level: 'info' as const,
      correlationId: 'test-correlation-id',
      tenantId: 'test-tenant',
      serviceId: 'test-service',
      action: 'login',
      outcome: 'success' as const,
      message: 'User logged in',
      details: { method: 'password' },
      complianceRelevant: false,
      complianceFrameworks: [],
      userId: 'user-123',
    };

    (mockPool.query as any).mockResolvedValueOnce({ rows: [] }); // Genesis check

    const eventId = await auditSystem.recordEvent(eventData);
    expect(eventId).toBeDefined();

    // Should have signed the event
    expect(auditSystem['eventBuffer'][0].signature).toBeDefined();
  });

  it('should flush critical events immediately', async () => {
    const eventData = {
      eventType: 'security_alert' as const,
      level: 'critical' as const,
      correlationId: 'test-correlation-id',
      tenantId: 'test-tenant',
      serviceId: 'test-service',
      action: 'detect_breach',
      outcome: 'success' as const,
      message: 'Breach detected',
      details: {},
      complianceRelevant: true,
      complianceFrameworks: ['GDPR'] as ComplianceFramework[],
    };

    (mockPool.query as any).mockResolvedValueOnce({ rows: [] }); // Genesis check
    (mockPool.query as any).mockResolvedValueOnce({ rowCount: 1 }); // Flush insert

    await auditSystem.recordEvent(eventData);

    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });

  it('should generate compliance report', async () => {
    const mockEvents = [
      {
        id: '1',
        eventType: 'user_login',
        level: 'info',
        timestamp: new Date(),
        correlationId: '1',
        tenantId: 't1',
        serviceId: 's1',
        action: 'login',
        outcome: 'success',
        message: 'msg',
        details: {},
        complianceRelevant: true,
        complianceFrameworks: ['SOX'],
        hash: 'h1',
        signature: 's1',
      }
    ];

    (mockPool.query as any).mockResolvedValueOnce({ rows: mockEvents }); // queryEvents
    (mockPool.query as any).mockResolvedValueOnce({ rowCount: 1 }); // storeComplianceReport

    const report = await auditSystem.generateComplianceReport('SOX', new Date(), new Date());

    expect(report.framework).toBe('SOX');
    expect(report.summary.totalEvents).toBe(1);
  });

  it('should maintain hash chain integrity', async () => {
    const eventData1 = {
      eventType: 'system_start' as const,
      level: 'info' as const,
      correlationId: 'c1',
      tenantId: 't1',
      serviceId: 's1',
      action: 'start',
      outcome: 'success' as const,
      message: 'Start',
      details: {},
      complianceRelevant: false,
      complianceFrameworks: []
    };

    const eventData2 = { ...eventData1, eventType: 'user_login' as const };

    (mockPool.query as any).mockResolvedValue({ rows: [] }); // genesis

    await auditSystem.recordEvent(eventData1);
    await auditSystem.recordEvent(eventData2);

    const event1 = auditSystem['eventBuffer'][0];
    const event2 = auditSystem['eventBuffer'][1];

    expect(event1.previousEventHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    expect(event2.previousEventHash).toBe(event1.hash);
  });
});
