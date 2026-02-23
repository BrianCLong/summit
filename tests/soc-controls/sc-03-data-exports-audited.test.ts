/**
 * SOC Control SC-03: Data exports produce structured audit events
 *
 * Trust Service Criterion: CC6.7 (Data Classification & Handling)
 * Requirement: Bulk data exports (disclosure bundles, OSINT feeds) must
 *              emit audit events with actor, resource, and compliance tags.
 *
 * Verification: Confirm export-service and OSINT ingest routes call
 *               securityAudit.logDataExport / logDataImport.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const EXPORT_SERVICE_PATH = resolve(
  __dirname,
  '../../server/src/disclosure/export-service.ts',
);

const OSINT_ROUTE_PATH = resolve(
  __dirname,
  '../../server/src/routes/osint.ts',
);

const INGEST_ROUTE_PATH = resolve(
  __dirname,
  '../../server/src/routes/ingest.ts',
);

describe('SC-03: Data exports produce structured audit events', () => {
  let exportSource: string;
  let osintSource: string;
  let ingestSource: string;

  beforeAll(() => {
    exportSource = readFileSync(EXPORT_SERVICE_PATH, 'utf-8');
    osintSource = readFileSync(OSINT_ROUTE_PATH, 'utf-8');
    ingestSource = readFileSync(INGEST_ROUTE_PATH, 'utf-8');
  });

  it('disclosure export service imports SecurityAuditLogger', () => {
    expect(exportSource).toContain("from '../audit/security-audit-logger.js'");
  });

  it('disclosure export service calls logDataExport', () => {
    expect(exportSource).toContain('logDataExport');
  });

  it('disclosure export audit event includes compliance frameworks', () => {
    expect(exportSource).toContain("complianceFrameworks: ['SOC2', 'GDPR']");
  });

  it('OSINT feed ingest calls logDataImport', () => {
    expect(osintSource).toContain('logDataImport');
  });

  it('bulk ingest route calls logDataImport', () => {
    expect(ingestSource).toContain('logDataImport');
  });
});
