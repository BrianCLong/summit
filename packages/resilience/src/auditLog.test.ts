import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appendAuditLog, verifyAuditChain } from './auditLog.js';
import { ValidationReport } from './types.js';

function tmpAuditPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'resilience-audit-'));
  return path.join(dir, 'audit-log.jsonl');
}

describe('audit log chain', () => {
  it('creates a chained immutable log', () => {
    const auditPath = tmpAuditPath();
    const baseReport: ValidationReport = {
      overallStatus: 'pass',
      results: [
        { epic: 'Epic 1 — DR Baseline', status: 'pass', findings: [] },
        { epic: 'Epic 2 — Dependency Isolation', status: 'pass', findings: [] },
      ],
    };

    const first = appendAuditLog('plan.json', baseReport, auditPath);
    const second = appendAuditLog('plan.json', baseReport, auditPath);

    expect(first.hash).not.toEqual(second.hash);
    expect(verifyAuditChain(auditPath)).toBe(true);

    const tampered = fs.readFileSync(auditPath, 'utf-8').split('\n').filter(Boolean);
    const compromised = JSON.parse(tampered[0]) as typeof first;
    compromised.previousHash = 'bogus';
    tampered[0] = JSON.stringify(compromised);
    fs.writeFileSync(auditPath, tampered.join('\n')); // break integrity intentionally

    expect(verifyAuditChain(auditPath)).toBe(false);
  });
});
