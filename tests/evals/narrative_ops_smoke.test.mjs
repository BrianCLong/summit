import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

test('narrative ops eval smoke', (t) => {
    // Run the script
    execSync('node scripts/evals/run_narrative_ops_smoke.mjs', { stdio: 'inherit' });

    const evidenceDir = 'subsumption/narrative-ops-detection-2026-01-28/runs/ci/EVD-NAROPS-EVAL-001';

    // Verify files exist
    assert.ok(fs.existsSync(path.join(evidenceDir, 'report.json')));
    assert.ok(fs.existsSync(path.join(evidenceDir, 'metrics.json')));
    assert.ok(fs.existsSync(path.join(evidenceDir, 'stamp.json')));

    // Verify determinism (no timestamp in report/metrics)
    const report = fs.readFileSync(path.join(evidenceDir, 'report.json'), 'utf8');
    const metrics = fs.readFileSync(path.join(evidenceDir, 'metrics.json'), 'utf8');

    assert.ok(!report.includes('"timestamp":'), 'report.json should not contain timestamp');
    assert.ok(!metrics.includes('"timestamp":'), 'metrics.json should not contain timestamp');

    // Check values
    const m = JSON.parse(metrics);
    assert.strictEqual(m.metrics.events_count, 3);
    assert.strictEqual(m.metrics.unique_domains, 3);
});
