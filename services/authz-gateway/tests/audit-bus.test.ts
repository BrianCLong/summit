import fs from 'fs';
import os from 'os';
import path from 'path';
import { AuditBus } from '../src/audit';

describe('AuditBus', () => {
  it('chains checksums for tamper-evident decision events', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-bus-'));
    const logPath = path.join(tmpDir, 'audit.log');
    try {
      const bus = new AuditBus({
        logPath,
        hmacKey: 'sample-key',
        now: () => 1_700_000_000_000,
        defaultPolicyBundleHash: 'sha256:policy',
      });

      const first = bus.publish({
        subject: 'alice',
        action: 'dataset:read',
        resource: 'dataset-alpha',
        resourceType: 'dataset',
        resourceTenantId: 'tenantA',
        tenantId: 'tenantA',
        allowed: true,
        reason: 'allow',
        policyId: 'policy-1',
        policyVersion: 'v12',
        evaluationMs: 12,
        roles: ['analyst'],
        attributes: { residency: 'us' },
      });
      const second = bus.publish({
        subject: 'alice',
        action: 'dataset:read',
        resource: 'dataset-beta',
        resourceType: 'dataset',
        resourceTenantId: 'tenantA',
        tenantId: 'tenantA',
        allowed: false,
        reason: 'quota_exhausted',
        policyId: 'policy-1',
        policyVersion: 'v12',
        evaluationMs: 10,
        roles: ['analyst'],
        attributes: { residency: 'us' },
      });

      const records = fs
        .readFileSync(logPath, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));

      expect(records).toHaveLength(2);
      expect(records[0].checksum).toBe(first.checksum);
      expect(records[1].checksum).toBe(second.checksum);
      expect(records[1].previousChecksum).toBe(first.checksum);
      expect(records[0].event.source_service).toBe('authz-gateway');
      expect(records[0].event.event_type).toBe('authz.decision.v1');
      expect(records[0].event.data.policy_bundle_hash).toBe('sha256:policy');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
