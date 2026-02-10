/**
 * Switchboard Capsule Evidence Bundle
 */

import * as fs from 'fs';
import * as path from 'path';
import { readLedgerEntries, verifyLedger } from './switchboard-ledger.js';
import { canExport, PricingTier } from './switchboard-quota.js';

export interface EvidenceBundleResult {
  evidenceDir: string;
  manifestPath: string;
  ledgerPath: string;
  diffPath: string;
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyIfExists(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    return;
  }
  ensureDir(path.dirname(dest));
  fs.cpSync(src, dest, { recursive: true });
}

export function generateEvidenceBundle(
  repoRoot: string,
  sessionId: string,
  tier: PricingTier = 'community'
): EvidenceBundleResult {
  if (!canExport(tier)) {
    throw new Error(`Evidence bundle export is not available on the ${tier} tier. Please upgrade to Pro or higher.`);
  }

  const sessionDir = path.join(repoRoot, '.switchboard', 'capsules', sessionId);
  if (!fs.existsSync(sessionDir)) {
    throw new Error(`Capsule session not found: ${sessionId}`);
  }

  const evidenceDir = path.join(repoRoot, '.switchboard', 'evidence', sessionId);
  ensureDir(evidenceDir);

  const manifestPath = path.join(sessionDir, 'manifest.json');
  const ledgerPath = path.join(sessionDir, 'ledger.jsonl');
  const diffPath = path.join(sessionDir, 'diff.patch');
  const outputsDir = path.join(sessionDir, 'outputs');

  copyIfExists(manifestPath, path.join(evidenceDir, 'manifest.json'));
  copyIfExists(ledgerPath, path.join(evidenceDir, 'ledger.jsonl'));
  copyIfExists(diffPath, path.join(evidenceDir, 'diffs', 'changes.patch'));
  copyIfExists(outputsDir, path.join(evidenceDir, 'outputs'));
  copyIfExists(path.join(sessionDir, 'replay-report.json'), path.join(evidenceDir, 'replay-report.json'));

  const ledgerEntries = readLedgerEntries(ledgerPath);
  const testEntries = ledgerEntries.filter((entry) => entry.type === 'test_result');
  if (testEntries.length > 0) {
    fs.writeFileSync(
      path.join(evidenceDir, 'test-results.json'),
      `${JSON.stringify(testEntries, null, 2)}\n`,
      'utf8'
    );
  }

  const verification = verifyLedger(ledgerPath);
  fs.writeFileSync(
    path.join(evidenceDir, 'ledger-verification.json'),
    `${JSON.stringify(verification, null, 2)}\n`,
    'utf8'
  );

  return {
    evidenceDir,
    manifestPath: path.join(evidenceDir, 'manifest.json'),
    ledgerPath: path.join(evidenceDir, 'ledger.jsonl'),
    diffPath: path.join(evidenceDir, 'diffs', 'changes.patch'),
  };
}
