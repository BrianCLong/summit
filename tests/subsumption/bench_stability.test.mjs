import { describe, test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const script = path.resolve('scripts/bench/azure-turin-v7_bench.mjs');
const metricsPath = path.resolve('evidence/azure-turin-v7/bench/metrics.json');

describe('azure-turin-v7 benchmark', () => {
  test('runs and produces metrics', () => {
    execSync(`node ${script}`);
    assert.ok(fs.existsSync(metricsPath), 'metrics.json missing');

    const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    assert.equal(data.evidence_id, "EVD-AZURETURINV7-BENCH-001");
    assert.ok(typeof data.metrics.cpu_burn_ms === 'number');
  });
});
