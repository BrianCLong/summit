import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  canonicalizeJson,
  compareByCodeUnit,
  scanTimestampKeys,
} from '../lib/evidence_id_consistency.mjs';

const scriptPath = path.join(
  process.cwd(),
  'scripts',
  'ci',
  'verify_evidence_id_consistency.mjs',
);

async function runGateWithSha({ sha, runId, outDir, evidenceRoot }) {
  await fs.mkdir(outDir, { recursive: true });
  const args = [
    scriptPath,
    `--sha=${sha}`,
    `--run-id=${runId}`,
    `--out-dir=${outDir}`,
    `--evidence-root=${evidenceRoot}`,
  ];
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Gate exited with code ${code}`));
      }
    });
  });
  return {
    reportPath: path.join(outDir, 'report.json'),
    metricsPath: path.join(outDir, 'metrics.json'),
    stampPath: path.join(outDir, 'stamp.json'),
    aiLedgerPath: path.join(outDir, 'ai_ledger.json'),
  };
}

describe('Evidence ID Consistency Gate', () => {
  let tempRoot;
  let evidenceRoot;

  beforeAll(async () => {
    tempRoot = await fs.mkdtemp(
      path.join(process.cwd(), 'artifacts', 'tmp-evidence-id-'),
    );
    evidenceRoot = path.join(tempRoot, 'evidence');
    await fs.mkdir(evidenceRoot, { recursive: true });
    await fs.writeFile(path.join(evidenceRoot, 'alpha.txt'), 'alpha');
    await fs.writeFile(path.join(evidenceRoot, 'beta.txt'), 'beta');
  });

  afterAll(async () => {
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  test('produces deterministic artifacts for identical inputs', async () => {
    const sha = 'deadbeef';
    const runId = 'run-123';
    const run1 = path.join(tempRoot, 'run1');
    const run2 = path.join(tempRoot, 'run2');
    const run3 = path.join(tempRoot, 'run3');

    const out1 = await runGateWithSha({
      sha,
      runId,
      outDir: run1,
      evidenceRoot,
    });
    const out2 = await runGateWithSha({
      sha,
      runId,
      outDir: run2,
      evidenceRoot,
    });
    const out3 = await runGateWithSha({
      sha,
      runId,
      outDir: run3,
      evidenceRoot,
    });

    const report1 = await fs.readFile(out1.reportPath, 'utf8');
    const report2 = await fs.readFile(out2.reportPath, 'utf8');
    const report3 = await fs.readFile(out3.reportPath, 'utf8');
    expect(report1).toEqual(report2);
    expect(report1).toEqual(report3);

    const metrics1 = await fs.readFile(out1.metricsPath, 'utf8');
    const metrics2 = await fs.readFile(out2.metricsPath, 'utf8');
    const metrics3 = await fs.readFile(out3.metricsPath, 'utf8');
    expect(metrics1).toEqual(metrics2);
    expect(metrics1).toEqual(metrics3);

    const ledger1 = await fs.readFile(out1.aiLedgerPath, 'utf8');
    const ledger2 = await fs.readFile(out2.aiLedgerPath, 'utf8');
    const ledger3 = await fs.readFile(out3.aiLedgerPath, 'utf8');
    expect(ledger1).toEqual(ledger2);
    expect(ledger1).toEqual(ledger3);

    const reportKeys = scanTimestampKeys(JSON.parse(report1));
    const metricsKeys = scanTimestampKeys(JSON.parse(metrics1));
    const ledgerKeys = scanTimestampKeys(JSON.parse(ledger1));
    expect(reportKeys).toEqual([]);
    expect(metricsKeys).toEqual([]);
    expect(ledgerKeys).toEqual([]);

    const stampKeys = scanTimestampKeys(
      JSON.parse(await fs.readFile(out1.stampPath, 'utf8')),
    );
    expect(stampKeys.length).toBeGreaterThan(0);
  });

  test('compareByCodeUnit is a deterministic total order', () => {
    expect(compareByCodeUnit('alpha', 'beta')).toBeLessThan(0);
    expect(compareByCodeUnit('beta', 'alpha')).toBeGreaterThan(0);
    expect(compareByCodeUnit('alpha', 'alpha')).toBe(0);
    expect(compareByCodeUnit('a\u0301', 'á')).not.toBe(0);
  });

  test('canonicalizeJson sorts keys recursively', () => {
    const input = {
      zebra: 1,
      alpha: { delta: 2, beta: 1 },
    };
    const expected = [
      '{',
      '  "alpha": {',
      '    "beta": 1,',
      '    "delta": 2',
      '  },',
      '  "zebra": 1',
      '}',
      '',
    ].join('\n');
    expect(canonicalizeJson(input)).toBe(expected);
  });

  test('scanTimestampKeys inspects keys only', () => {
    const payload = {
      message: 'timestamp',
      meta: { created_at: '2026-01-01T00:00:00Z' },
    };
    expect(scanTimestampKeys(payload)).toEqual(['meta.created_at']);
  });
});
