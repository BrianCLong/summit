/**
 * Switchboard Capsule Evidence Bundle
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { readLedgerEntries, verifyLedger } from './switchboard-ledger.js';
import { VERSION } from './constants.js';

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

export function generateEvidenceBundle(repoRoot: string, sessionId: string): EvidenceBundleResult {
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

export interface ExportMetadata {
  run_id: string;
  created_at: string;
  version: string;
  files: Record<string, string>;
}

export function exportEvidenceBundle(repoRoot: string, sessionId: string, exportPath: string): string {
  const sessionDir = path.join(repoRoot, '.switchboard', 'capsules', sessionId);
  if (!fs.existsSync(sessionDir)) {
    throw new Error(`Capsule session not found: ${sessionId}`);
  }

  ensureDir(exportPath);

  const filesToCopy = [
    { src: 'manifest.json', dest: 'manifest.json' },
    { src: 'ledger.jsonl', dest: 'receipts.jsonl' },
    { src: 'diff.patch', dest: 'changes.patch' },
  ];

  const metadata: ExportMetadata = {
    run_id: sessionId,
    created_at: new Date().toISOString(),
    version: VERSION,
    files: {},
  };

  for (const { src, dest } of filesToCopy) {
    const srcPath = path.join(sessionDir, src);
    if (fs.existsSync(srcPath)) {
      const content = fs.readFileSync(srcPath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      fs.writeFileSync(path.join(exportPath, dest), content);
      metadata.files[dest] = hash;
    }
  }

  // Add config snapshot hash if present
  const snapshotDir = path.join(sessionDir, 'snapshot');
  if (fs.existsSync(snapshotDir)) {
    // For MVP, we just record that a snapshot existed or could hash its list
    metadata.files['snapshot/'] = 'present';
  }

  fs.writeFileSync(
    path.join(exportPath, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf8'
  );

  return exportPath;
}

export function verifyEvidenceBundle(bundlePath: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const metadataPath = path.join(bundlePath, 'metadata.json');

  if (!fs.existsSync(metadataPath)) {
    errors.push('Missing metadata.json');
    return { valid: false, errors };
  }

  try {
    const metadata: ExportMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

    for (const [filename, expectedHash] of Object.entries(metadata.files)) {
      if (filename.endsWith('/')) continue; // Skip directory markers

      const filePath = path.join(bundlePath, filename);
      if (!fs.existsSync(filePath)) {
        errors.push(`Missing file: ${filename}`);
        continue;
      }

      const content = fs.readFileSync(filePath);
      const actualHash = crypto.createHash('sha256').update(content).digest('hex');
      if (actualHash !== expectedHash) {
        errors.push(`Hash mismatch for ${filename}: expected ${expectedHash}, got ${actualHash}`);
      }

      // If it's the ledger, perform deep verification
      if (filename === 'receipts.jsonl') {
        const ledgerVerif = verifyLedger(filePath);
        if (!ledgerVerif.valid) {
          errors.push(...ledgerVerif.errors.map(e => `Ledger integrity error: ${e}`));
        }
      }
    }
  } catch (error) {
    errors.push(`Failed to parse metadata: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { valid: errors.length === 0, errors };
}
