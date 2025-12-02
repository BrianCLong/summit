import { describe, expect, it } from 'vitest';
import { ForensicAuditLedger } from '../src/forensic-ledger.js';

describe('ForensicAuditLedger', () => {
  it('links evidence events with hashes and signatures', () => {
    const ledger = new ForensicAuditLedger({ signingKey: 'secret-key', system: 'dfir' });

    const first = ledger.append({
      evidenceId: 'ev-1',
      actor: 'custodian',
      action: 'ingest',
      location: 'locker-a',
      metadata: { checksum: 'abc123' },
    });

    const second = ledger.append({
      evidenceId: 'ev-1',
      actor: 'analyst',
      action: 'transfer',
      location: 'lab-1',
      correlationIds: ['case-42'],
    });

    expect(first.hash).toHaveLength(64);
    expect(second.previousHash).toBe(first.hash);

    const verification = ledger.verifyChain();
    expect(verification.ok).toBe(true);
    expect(verification.headHash).toBe(second.hash);
  });

  it('detects tampering across the chain and signatures', () => {
    const ledger = new ForensicAuditLedger({ signingKey: 'secret-key' });
    ledger.append({
      evidenceId: 'ev-2',
      actor: 'custodian',
      action: 'ingest',
    });
    ledger.append({
      evidenceId: 'ev-2',
      actor: 'reviewer',
      action: 'access',
      severity: 'medium',
    });

    ledger.unsafeMutateEntry(0, (entry) => {
      entry.hash = '00bad00';
    });
    ledger.unsafeMutateEntry(1, (entry) => {
      entry.signature = 'tampered';
    });

    const verification = ledger.verifyChain();
    expect(verification.ok).toBe(false);
    const reasons = verification.failures.map((failure) => failure.reason);
    expect(reasons).toContain('HASH_MISMATCH');
    expect(reasons).toContain('SIGNATURE_MISMATCH');
  });

  it('builds compliance reports with chain of custody coverage', () => {
    const ledger = new ForensicAuditLedger({ signingKey: 'secret-key' });
    ledger.append({
      evidenceId: 'ev-3',
      actor: 'custodian',
      action: 'ingest',
      location: 'locker-b',
      severity: 'high',
    });
    ledger.append({
      evidenceId: 'ev-3',
      actor: 'analyst',
      action: 'access',
      location: 'analysis-bay',
    });
    ledger.append({
      evidenceId: 'ev-3',
      actor: 'analyst',
      action: 'transfer',
      location: 'evidence-vault',
    });

    const report = ledger.buildComplianceReport('case-9001');
    expect(report.caseId).toBe('case-9001');
    expect(report.tamperDetected).toBe(false);
    expect(report.summary.totalEvents).toBe(3);
    expect(report.summary.highSeverityFindings).toBe(1);
    expect(report.custody[0].events).toHaveLength(3);
    expect(report.digest).toHaveLength(64);
  });

  it('returns cloned entries to prevent accidental mutation of the ledger', () => {
    const ledger = new ForensicAuditLedger({ signingKey: 'secret-key' });
    const original = ledger.append({
      evidenceId: 'ev-4',
      actor: 'custodian',
      action: 'ingest',
    });

    const listed = ledger.list();
    listed[0].hash = 'tampered-outside-ledger';
    listed[0].signature = 'tampered-signature';

    const verification = ledger.verifyChain();
    expect(verification.ok).toBe(true);
    expect(verification.headHash).toBe(original.hash);
  });
});
