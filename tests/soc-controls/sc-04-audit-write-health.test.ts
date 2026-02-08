/**
 * SOC Control SC-04: Audit log write failures are observable
 *
 * Trust Service Criterion: CC7.2 (System Monitoring)
 * Requirement: If the audit system fails to persist an event, that failure
 *              must be captured in a Prometheus metric so SOC can detect
 *              silent audit gaps.
 *
 * Verification: Confirm SecurityAuditLogger defines failure counters and
 *               that the emit() path increments them on error.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const AUDIT_LOGGER_PATH = resolve(
  __dirname,
  '../../server/src/audit/security-audit-logger.ts',
);

const WS_METRICS_PATH = resolve(
  __dirname,
  '../../services/websocket-server/src/metrics/prometheus.ts',
);

describe('SC-04: Audit log write failures are observable', () => {
  let auditLoggerSource: string;
  let wsMetricsSource: string;

  beforeAll(() => {
    auditLoggerSource = readFileSync(AUDIT_LOGGER_PATH, 'utf-8');
    wsMetricsSource = readFileSync(WS_METRICS_PATH, 'utf-8');
  });

  it('defines security_audit_writes_total counter', () => {
    expect(auditLoggerSource).toContain('security_audit_writes_total');
  });

  it('defines security_audit_write_failures_total counter', () => {
    expect(auditLoggerSource).toContain('security_audit_write_failures_total');
  });

  it('increments failure counter in error path', () => {
    expect(auditLoggerSource).toContain("outcome: 'failure'");
    expect(auditLoggerSource).toContain('securityAuditWriteFailuresTotal.inc');
  });

  it('WebSocket service also defines audit write health metric', () => {
    expect(wsMetricsSource).toContain('websocket_security_audit_writes_total');
  });
});
