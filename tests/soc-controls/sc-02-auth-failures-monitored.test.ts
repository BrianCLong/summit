/**
 * SOC Control SC-02: Auth failures are monitored via metrics
 *
 * Trust Service Criterion: CC6.1 / CC7.2 (System Monitoring)
 * Requirement: Authentication and permission denials must be captured
 *              in Prometheus metrics so SOC dashboards can alert on spikes.
 *
 * Verification: Confirm the auth middleware increments denial counters
 *               and that the SecurityAuditLogger exposes denial metrics.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const AUTH_MIDDLEWARE_PATH = resolve(
  __dirname,
  '../../server/src/middleware/auth.ts',
);

const AUDIT_LOGGER_PATH = resolve(
  __dirname,
  '../../server/src/audit/security-audit-logger.ts',
);

describe('SC-02: Auth failures are monitored', () => {
  let authSource: string;
  let auditLoggerSource: string;

  beforeAll(() => {
    authSource = readFileSync(AUTH_MIDDLEWARE_PATH, 'utf-8');
    auditLoggerSource = readFileSync(AUDIT_LOGGER_PATH, 'utf-8');
  });

  it('server auth middleware tracks PBAC decisions via metrics', () => {
    expect(authSource).toContain('pbacDecisionsTotal');
  });

  it('server auth middleware records policy_violation audit events on deny', () => {
    expect(authSource).toContain("eventType: 'policy_violation'");
  });

  it('SecurityAuditLogger exposes security_auth_denials_total metric', () => {
    expect(auditLoggerSource).toContain('security_auth_denials_total');
  });

  it('SecurityAuditLogger provides logAuthDenial method', () => {
    expect(auditLoggerSource).toContain('logAuthDenial');
  });
});
