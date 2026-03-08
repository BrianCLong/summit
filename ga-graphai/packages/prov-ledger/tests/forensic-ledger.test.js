"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const forensic_ledger_js_1 = require("../src/forensic-ledger.js");
(0, vitest_1.describe)('ForensicAuditLedger', () => {
    (0, vitest_1.it)('links evidence events with hashes and signatures', () => {
        const ledger = new forensic_ledger_js_1.ForensicAuditLedger({ signingKey: 'secret-key', system: 'dfir' });
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
        (0, vitest_1.expect)(first.hash).toHaveLength(64);
        (0, vitest_1.expect)(second.previousHash).toBe(first.hash);
        const verification = ledger.verifyChain();
        (0, vitest_1.expect)(verification.ok).toBe(true);
        (0, vitest_1.expect)(verification.headHash).toBe(second.hash);
    });
    (0, vitest_1.it)('detects tampering across the chain and signatures', () => {
        const ledger = new forensic_ledger_js_1.ForensicAuditLedger({ signingKey: 'secret-key' });
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
        (0, vitest_1.expect)(verification.ok).toBe(false);
        const reasons = verification.failures.map((failure) => failure.reason);
        (0, vitest_1.expect)(reasons).toContain('HASH_MISMATCH');
        (0, vitest_1.expect)(reasons).toContain('SIGNATURE_MISMATCH');
    });
    (0, vitest_1.it)('builds compliance reports with chain of custody coverage', () => {
        const ledger = new forensic_ledger_js_1.ForensicAuditLedger({ signingKey: 'secret-key' });
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
        (0, vitest_1.expect)(report.caseId).toBe('case-9001');
        (0, vitest_1.expect)(report.tamperDetected).toBe(false);
        (0, vitest_1.expect)(report.summary.totalEvents).toBe(3);
        (0, vitest_1.expect)(report.summary.highSeverityFindings).toBe(1);
        (0, vitest_1.expect)(report.custody[0].events).toHaveLength(3);
        (0, vitest_1.expect)(report.digest).toHaveLength(64);
    });
    (0, vitest_1.it)('returns cloned entries to prevent accidental mutation of the ledger', () => {
        const ledger = new forensic_ledger_js_1.ForensicAuditLedger({ signingKey: 'secret-key' });
        const original = ledger.append({
            evidenceId: 'ev-4',
            actor: 'custodian',
            action: 'ingest',
        });
        const listed = ledger.list();
        listed[0].hash = 'tampered-outside-ledger';
        listed[0].signature = 'tampered-signature';
        const verification = ledger.verifyChain();
        (0, vitest_1.expect)(verification.ok).toBe(true);
        (0, vitest_1.expect)(verification.headHash).toBe(original.hash);
    });
});
