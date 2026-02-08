/**
 * SOC Control SC-01: All sensitive report views are auditable
 *
 * Trust Service Criterion: CC6.1 (Logical Access Security)
 * Requirement: Every report view/generate/schedule action must emit a
 *              structured audit event via SecurityAuditLogger.
 *
 * Verification: Confirm the reporting routes import and call securityAudit
 *               methods for each sensitive endpoint.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const REPORTING_ROUTE_PATH = resolve(
  __dirname,
  '../../server/src/routes/reporting.ts',
);

describe('SC-01: Sensitive report views are auditable', () => {
  let source: string;

  beforeAll(() => {
    source = readFileSync(REPORTING_ROUTE_PATH, 'utf-8');
  });

  it('imports SecurityAuditLogger', () => {
    expect(source).toContain("from '../audit/security-audit-logger.js'");
  });

  it('audits GET /templates (report template listing)', () => {
    expect(source).toContain('logSensitiveRead');
    expect(source).toContain("resourceType: 'report_template'");
  });

  it('audits POST /generate (report generation)', () => {
    expect(source).toContain("action: 'generate'");
    expect(source).toContain("resourceType: 'report'");
  });

  it('audits POST /schedule (report scheduling)', () => {
    expect(source).toContain('logResourceModify');
    expect(source).toContain("resourceType: 'report_schedule'");
  });

  it('audits GET /history/:templateId (report history)', () => {
    expect(source).toContain("resourceType: 'report_history'");
  });
});
