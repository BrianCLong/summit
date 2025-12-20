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
      });

      const first = bus.publish({
        subject: 'alice',
        action: 'dataset:read',
        resource: 'dataset-alpha',
        tenantId: 'tenantA',
        allowed: true,
        reason: 'allow',
        clientId: 'governance-sample-client',
        apiMethod: 'companyos.decisions.check',
      });
      const second = bus.publish({
        subject: 'alice',
        action: 'dataset:read',
        resource: 'dataset-beta',
        tenantId: 'tenantA',
        allowed: false,
        reason: 'quota_exhausted',
        clientId: 'governance-sample-client',
        apiMethod: 'companyos.decisions.check',
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
      expect(records[0].event.service).toBe('authz-gateway');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
