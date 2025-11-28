import { sign } from 'jsonwebtoken';
import { ComprehensiveAuditLoggingService } from '../src/services/ComprehensiveAuditLoggingService.js';
import {
  AuditEvent,
  AuditQuery,
  ComplianceFramework,
} from '../src/audit/advanced-audit-system.js';

describe('ComprehensiveAuditLoggingService', () => {
  const signingKey = 'test-signing-key';

  class FakeAuditSystem {
    private events: AuditEvent[] = [];
    private lastHash: string | undefined;

    async recordEvent(event: Partial<AuditEvent>): Promise<string> {
      const id = `${this.events.length + 1}`;
      const timestamp = event.timestamp ?? new Date();
      const hash = `${id}:${event.eventType}:${timestamp.getTime()}`;
      const previousEventHash = this.lastHash;
      const signature = sign({ id, hash }, signingKey);

      const stored: AuditEvent = {
        id,
        level: event.level ?? 'info',
        eventType: event.eventType ?? 'user_action',
        timestamp,
        correlationId: event.correlationId ?? 'corr-1',
        tenantId: event.tenantId ?? 'tenant-1',
        serviceId: event.serviceId ?? 'svc',
        action: event.action ?? 'action',
        outcome: event.outcome ?? 'success',
        message: event.message ?? 'msg',
        details: event.details ?? {},
        complianceRelevant: event.complianceRelevant ?? true,
        complianceFrameworks: event.complianceFrameworks ?? ['SOC2'],
        hash,
        signature,
        previousEventHash,
      };

      this.events.push(stored);
      this.lastHash = hash;
      return id;
    }

    async queryEvents(_query: AuditQuery): Promise<AuditEvent[]> {
      return [...this.events];
    }

    async generateComplianceReport(
      framework: ComplianceFramework,
      start: Date,
      end: Date,
    ) {
      return {
        framework,
        period: { start, end },
        summary: {
          totalEvents: this.events.length,
          criticalEvents: this.events.filter((e) => e.level === 'critical').length,
          violations: 0,
          complianceScore: 100,
        },
        violations: [],
        recommendations: [],
      };
    }

    mutateEvent(index: number, update: Partial<AuditEvent>) {
      this.events[index] = { ...this.events[index], ...update };
    }
  }

  class FakeWorm {
    public entries: any[] = [];
    async addAuditEntry(entry: any) {
      this.entries.push(entry);
    }
  }

  const buildService = (
    auditSystem = new FakeAuditSystem(),
    worm = new FakeWorm(),
  ) => ({
    service: new ComprehensiveAuditLoggingService(auditSystem as any, {
      signingKey,
      worm: worm as any,
    }),
    auditSystem,
    worm,
  });

  it('records events with tamper-proof metadata and WORM forwarding', async () => {
    const { service, auditSystem, worm } = buildService();

    const { eventId } = await service.recordComprehensiveEvent({
      eventType: 'resource_access',
      action: 'view',
      tenantId: 'tenant-a',
      serviceId: 'intelgraph-api',
      correlationId: 'corr-123',
      message: 'Viewed resource',
      outcome: 'success',
      userId: 'user-1',
      resourceId: 'res-1',
      details: { field: 'value' },
      complianceFrameworks: ['SOC2', 'GDPR'],
    });

    expect(eventId).toBe('1');
    expect((auditSystem as any).events[0].previousEventHash).toBeUndefined();
    expect(worm.entries).toHaveLength(1);
    expect(worm.entries[0]).toMatchObject({
      action: 'view',
      eventType: 'resource_access',
      resource: 'res-1',
      classification: 'internal',
    });
  });

  it('verifies tamper-proof trail and detects hash or signature issues', async () => {
    const { service, auditSystem } = buildService();

    await service.recordComprehensiveEvent({
      eventType: 'resource_access',
      action: 'view',
      tenantId: 'tenant-a',
      serviceId: 'svc',
      correlationId: 'corr',
      message: 'first',
      outcome: 'success',
    });

    await service.recordComprehensiveEvent({
      eventType: 'resource_modify',
      action: 'update',
      tenantId: 'tenant-a',
      serviceId: 'svc',
      correlationId: 'corr',
      message: 'second',
      outcome: 'success',
    });

    let verification = await service.verifyTamperProofTrail({ tenantIds: ['tenant-a'] });
    expect(verification.valid).toBe(true);

    (auditSystem as any).mutateEvent(1, { previousEventHash: 'tampered' });
    verification = await service.verifyTamperProofTrail({ tenantIds: ['tenant-a'] });
    expect(verification.valid).toBe(false);
    expect(verification.failures[0]).toMatchObject({ reason: 'hash_chain_mismatch' });

    (auditSystem as any).mutateEvent(1, { previousEventHash: (auditSystem as any).events[0].hash, signature: 'bad' });
    verification = await service.verifyTamperProofTrail({ tenantIds: ['tenant-a'] });
    expect(verification.valid).toBe(false);
    expect(verification.failures.some((f: any) => f.reason === 'invalid_signature')).toBe(true);
  });

  it('produces compliance evidence that bundles reports and integrity results', async () => {
    const { service } = buildService();
    const start = new Date('2024-01-01');
    const end = new Date('2024-02-01');

    await service.recordComprehensiveEvent({
      eventType: 'policy_decision',
      action: 'allow',
      tenantId: 'tenant-a',
      serviceId: 'svc',
      correlationId: 'corr',
      message: 'policy allow',
      outcome: 'success',
      level: 'critical',
    });

    const evidence = await service.generateComplianceEvidence('SOC2', start, end, {
      tenantIds: ['tenant-a'],
    });

    expect(evidence.report.summary.totalEvents).toBeGreaterThanOrEqual(1);
    expect(evidence.integrity.valid).toBe(true);
    expect(evidence.report.framework).toBe('SOC2');
  });
});
