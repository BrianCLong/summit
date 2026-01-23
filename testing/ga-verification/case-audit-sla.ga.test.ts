
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CaseAuditLogRepository } from '../../server/src/cases/domain/CaseAuditLog.js';
import { CaseSLAService } from '../../server/src/cases/sla/CaseSLAService.js';

// Mock Pool
class MockPool {
  query(_text, _params) {
    return Promise.resolve({ rows: [], rowCount: 0 });
  }
}

describe('Case Audit & SLA Verification (Tier B)', () => {
  let auditRepo;
  let slaService;
  let mockPool;

  beforeEach(() => {
    mockPool = new MockPool();
    auditRepo = new CaseAuditLogRepository(mockPool as any);
    slaService = new CaseSLAService(mockPool as any);
  });

  test('Audit Log - Compute Hash', async () => {
    const input = {
      caseId: 'case-123',
      tenantId: 'tenant-abc',
      actorId: 'user-1',
      action: 'CASE_VIEWED' as const,
      reasonForAccess: 'Investigation'
    };

    // Mock the queries
    mockPool.query = (text) => {
      if (text.includes('SELECT DISTINCT ON')) { return { rows: [] }; } // Init cache
      if (text.includes('SELECT hash FROM')) { return { rows: [] }; } // Get last hash
      if (text.includes('INSERT INTO')) {
        return {
          rows: [{
            audit_id: 'uuid',
            case_id: input.caseId,
            tenant_id: input.tenantId,
            actor_id: input.actorId,
            action: input.action,
            timestamp: new Date(),
            hash: 'mock-hash',
            prev_hash: null,
            resource_type: null,
            resource_id: null,
            details: null,
            reason_for_access: input.reasonForAccess,
            legal_basis: null,
            authority_id: null,
            policy_decision: null,
            session_context: null
          }]
        };
      }
      return { rows: [] };
    };

    const record = await auditRepo.append(input);
    assert.strictEqual(record.caseId, 'case-123');
    assert.strictEqual(record.hash, 'mock-hash');
  });

  test('SLA Service - Create Timer', async () => {
    const input = {
      caseId: 'case-123',
      tenantId: 'tenant-abc',
      type: 'RESOLUTION_TIME' as const,
      name: 'Resolve in 24h',
      targetDurationSeconds: 86400
    };

    mockPool.query = (text, _params) => {
      if (text.includes('INSERT INTO')) {
        return {
          rows: [{
            sla_id: 'sla-1',
            case_id: input.caseId,
            tenant_id: input.tenantId,
            type: input.type,
            name: input.name,
            start_time: new Date(),
            deadline: new Date(Date.now() + 86400000),
            status: 'ACTIVE',
            target_duration_seconds: input.targetDurationSeconds,
            metadata: {},
            completed_at: null
          }]
        };
      }
      return { rows: [] };
    };

    const timer = await slaService.createTimer(input);
    assert.strictEqual(timer.status, 'ACTIVE');
    assert.strictEqual(timer.targetDurationSeconds, 86400);
  });
});
