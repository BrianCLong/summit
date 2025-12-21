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

  it('resumes chains from existing logs and preserves metadata', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-bus-'));
    const logPath = path.join(tmpDir, 'audit.log');
    try {
      const firstBus = new AuditBus({
        logPath,
        hmacKey: 'carry-key',
        now: () => 1_800_000_000_000,
        serviceName: 'authz-gateway',
        serviceVersion: '2.0.0',
        environment: 'staging',
      });

      const initial = firstBus.publish({
        subject: 'bob',
        action: 'dataset:share',
        resource: 'dataset-theta',
        tenantId: 'tenantB',
        allowed: true,
        reason: 'allow',
        clientId: 'console',
      });

      const secondBus = new AuditBus({
        logPath,
        hmacKey: 'carry-key',
        now: () => 1_800_000_010_000,
        serviceVersion: '2.0.0',
        environment: 'staging',
      });

      const followOn = secondBus.publish({
        subject: 'bob',
        action: 'dataset:share',
        resource: 'dataset-theta',
        tenantId: 'tenantB',
        allowed: false,
        reason: 'quota_exceeded',
        apiMethod: 'companyos.decisions.check',
      });

      expect(followOn.previousChecksum).toBe(initial.checksum);
      expect(followOn.event?.environment).toBe('staging');
      const parsed = JSON.parse(
        fs.readFileSync(logPath, 'utf8').trim().split('\n').pop() || '{}',
      );
      expect(parsed.checksum).toBe(followOn.checksum);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
