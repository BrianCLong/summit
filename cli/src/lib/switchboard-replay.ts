/**
 * Switchboard Capsule Replay
 */

import * as fs from 'fs';
import * as path from 'path';
import { runCapsule } from './switchboard-runner.js';
import {
  readLedgerEntries,
  verifyLedger,
  type LedgerEntry,
} from './switchboard-ledger.js';

export interface CapsuleReplayReport {
  original_session: string;
  replay_session: string;
  match: boolean;
  diff_match: boolean;
  outputs_match: boolean;
  policy_match: boolean;
  ledger_validations: {
    original_valid: boolean;
    replay_valid: boolean;
  };
  differences: string[];
}

function readText(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function listFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const results: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(fullPath).map((child) => path.join(entry.name, child)));
    } else if (entry.isFile()) {
      results.push(entry.name);
    }
  }
  return results.sort();
}

function compareOutputs(originalDir: string, replayDir: string): { match: boolean; differences: string[] } {
  const diffs: string[] = [];
  const originalFiles = listFiles(originalDir);
  const replayFiles = listFiles(replayDir);
  const allFiles = Array.from(new Set([...originalFiles, ...replayFiles])).sort();

  for (const file of allFiles) {
    const originalPath = path.join(originalDir, file);
    const replayPath = path.join(replayDir, file);
    if (!fs.existsSync(originalPath)) {
      diffs.push(`Missing original output: ${file}`);
      continue;
    }
    if (!fs.existsSync(replayPath)) {
      diffs.push(`Missing replay output: ${file}`);
      continue;
    }
    const originalText = readText(originalPath);
    const replayText = readText(replayPath);
    if (originalText !== replayText) {
      diffs.push(`Output mismatch: ${file}`);
    }
  }

  return { match: diffs.length === 0, differences: diffs };
}

function normalizeLedger(entry: LedgerEntry<Record<string, unknown>>): Record<string, unknown> {
  const { timestamp, prev_hash, entry_hash, session_id, seq, ...rest } = entry;
  const data = entry.data as Record<string, unknown>;
  if (entry.type === 'tool_exec') {
    const { duration_ms, ...remaining } = data;
    return { ...rest, data: remaining };
  }
  return { ...rest, data };
}

function comparePolicy(originalLedger: string, replayLedger: string): { match: boolean; differences: string[] } {
  const originalEntries = readLedgerEntries(originalLedger)
    .filter((entry) => ['policy_decision', 'test_result', 'tool_exec', 'diff_hash'].includes(entry.type))
    .map((entry) => normalizeLedger(entry));
  const replayEntries = readLedgerEntries(replayLedger)
    .filter((entry) => ['policy_decision', 'test_result', 'tool_exec', 'diff_hash'].includes(entry.type))
    .map((entry) => normalizeLedger(entry));

  const serializedOriginal = JSON.stringify(originalEntries, null, 2);
  const serializedReplay = JSON.stringify(replayEntries, null, 2);

  if (serializedOriginal === serializedReplay) {
    return { match: true, differences: [] };
  }
  return { match: false, differences: ['Ledger entries differ between runs'] };
}

export async function replayCapsule(repoRoot: string, sessionId: string): Promise<CapsuleReplayReport> {
  const originalSessionDir = path.join(repoRoot, '.switchboard', 'capsules', sessionId);
  const manifestPath = path.join(originalSessionDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Capsule manifest missing for session: ${sessionId}`);
  }

  const replayResult = await runCapsule({
    manifestPath,
    repoRoot,
  });

  const diffOriginal = readText(path.join(originalSessionDir, 'diff.patch'));
  const diffReplay = readText(path.join(replayResult.sessionDir, 'diff.patch'));
  const diffMatch = diffOriginal === diffReplay;
  const diffDifferences = diffMatch ? [] : ['Diff output mismatch'];

  const outputComparison = compareOutputs(
    path.join(originalSessionDir, 'outputs'),
    path.join(replayResult.sessionDir, 'outputs')
  );

  const policyComparison = comparePolicy(
    path.join(originalSessionDir, 'ledger.jsonl'),
    path.join(replayResult.sessionDir, 'ledger.jsonl')
  );

  const originalLedgerValidation = verifyLedger(path.join(originalSessionDir, 'ledger.jsonl'));
  const replayLedgerValidation = verifyLedger(path.join(replayResult.sessionDir, 'ledger.jsonl'));
  const ledgerMatch =
    originalLedgerValidation.valid && replayLedgerValidation.valid;

  const differences = [
    ...diffDifferences,
    ...outputComparison.differences,
    ...policyComparison.differences,
  ];

  if (!originalLedgerValidation.valid) {
    differences.push('Original ledger hash chain invalid');
  }
  if (!replayLedgerValidation.valid) {
    differences.push('Replay ledger hash chain invalid');
  }

  const report: CapsuleReplayReport = {
    original_session: sessionId,
    replay_session: replayResult.sessionId,
    match: differences.length === 0 && ledgerMatch,
    diff_match: diffMatch,
    outputs_match: outputComparison.match,
    policy_match: policyComparison.match,
    ledger_validations: {
      original_valid: originalLedgerValidation.valid,
      replay_valid: replayLedgerValidation.valid,
    },
    differences,
  };

  fs.writeFileSync(
    path.join(replayResult.sessionDir, 'replay-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );

  return report;
}
