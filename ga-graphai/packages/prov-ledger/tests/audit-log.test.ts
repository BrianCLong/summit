import { describe, expect, it } from 'vitest';
import { AppendOnlyAuditLog } from '../src/auditLog.js';

describe('AppendOnlyAuditLog', () => {
  it('appends events with hash chain and redaction', () => {
    const log = new AppendOnlyAuditLog(1);
    const first = log.append({
      tenant: 't1',
      action: 'login',
      actor: 'user1',
      resource: 'session',
      region: 'us',
      trace_id: 'trace-1',
      details: { email: 'user@example.com', ip: '127.0.0.1' },
    });

    const second = log.append({
      tenant: 't1',
      action: 'export.generated',
      actor: 'user1',
      resource: 'report',
      region: 'us',
      trace_id: 'trace-2',
      details: { ssn: '123-45-6789' },
    });

    expect(first.hash).toBeTruthy();
    expect(second.previousHash).toBe(first.hash);
    expect(log.verifyIntegrity()).toBe(true);
    expect(second.details?.ssn).toBe('***redacted***');
  });

  it('enforces step-up requirement for guarded exports', () => {
    const log = new AppendOnlyAuditLog();
    log.append({ tenant: 't2', action: 'export.generated' });

    expect(() =>
      log.query(
        { tenant: 't2', actions: ['export.generated'] },
        { limit: 10, stepUpRequired: true, stepUpSatisfied: false },
      ),
    ).toThrowError(/Step-up authentication required/);
  });
});
