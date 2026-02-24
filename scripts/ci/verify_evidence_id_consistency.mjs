#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  buildAiLedger,
  buildMetrics,
  buildReport,
  buildStamp,
  collectEvidenceEntries,
  compareByCodeUnit,
  hashBuffer,
  normalizeRelativePath,
  scanTimestampKeys,
  sortEvidenceEntries,
  writeJsonFile,
} from './lib/evidence_id_consistency.mjs';

const args = new Map();
for (const raw of process.argv.slice(2)) {
  const [key, value] = raw.split('=');
  if (key.startsWith('--')) {
    args.set(key.slice(2), value ?? true);
  }
}

const repoRoot = process.cwd();
const sha = args.get('sha') ?? 'UNKNOWN_SHA';
const runId = args.get('run-id') ?? 'UNKNOWN_RUN_ID';
const outDir = args.get('out-dir') ?? 'artifacts/evidence-id-consistency';
const evidenceRootInput = args.get('evidence-root') ?? 'evidence';
const evidenceRoot = path.isAbsolute(evidenceRootInput)
  ? evidenceRootInput
  : path.join(repoRoot, evidenceRootInput);
const evidenceRootRelative = normalizeRelativePath(repoRoot, evidenceRoot);

const startedAt = new Date().toISOString();
const startTime = Date.now();

const rawEntries = await collectEvidenceEntries({ repoRoot, evidenceRoot });
const evidenceEntries = sortEvidenceEntries(rawEntries);
const duplicates = Array.from(
  evidenceEntries.reduce((acc, entry) => {
    const matches = acc.get(entry.id) ?? [];
    matches.push(entry.path);
    acc.set(entry.id, matches);
    return acc;
  }, new Map()),
)
  .filter(([, paths]) => paths.length > 1)
  .map(([id, paths]) => ({
    id,
    paths: paths.slice().sort(compareByCodeUnit),
  }))
  .sort((left, right) => compareByCodeUnit(left.id, right.id));

const report = buildReport({
  evidenceRoot: evidenceRootRelative,
  sha,
  evidenceEntries,
  duplicates,
});
const metrics = buildMetrics({
  sha,
  evidenceTotal: evidenceEntries.length,
  duplicateCount: duplicates.length,
});

const reportPath = path.join(outDir, 'report.json');
const metricsPath = path.join(outDir, 'metrics.json');
await writeJsonFile(reportPath, report);
await writeJsonFile(metricsPath, metrics);

const deterministicArtifacts = [
  { name: 'report.json', path: reportPath },
  { name: 'metrics.json', path: metricsPath },
];

const artifactsWithHashes = [];
for (const artifact of deterministicArtifacts) {
  const content = await fs.readFile(artifact.path);
  artifactsWithHashes.push({
    name: artifact.name,
    sha256: hashBuffer(content),
  });
}

const aiLedger = buildAiLedger({ sha, artifacts: artifactsWithHashes });
const aiLedgerPath = path.join(outDir, 'ai_ledger.json');
await writeJsonFile(aiLedgerPath, aiLedger);

const finishedAt = new Date().toISOString();
const durationMs = Date.now() - startTime;
const stamp = buildStamp({
  sha,
  runId,
  startedAt,
  finishedAt,
  durationMs,
});
const stampPath = path.join(outDir, 'stamp.json');
await writeJsonFile(stampPath, stamp);

const deterministicScan = [];
for (const filePath of [reportPath, metricsPath, aiLedgerPath]) {
  const payload = JSON.parse(await fs.readFile(filePath, 'utf8'));
  deterministicScan.push(...scanTimestampKeys(payload));
}
if (deterministicScan.length > 0) {
  console.error(
    `Deterministic artifacts contain timestamp keys: ${deterministicScan.join(', ')}`,
  );
  process.exitCode = 1;
}
