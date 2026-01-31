import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('narrative ops analyzer is flagged off by default', (t) => {
    // Check manifest
    const manifestPath = 'subsumption/narrative-ops-detection-2026-01-28/manifest.yaml';
    const manifest = fs.readFileSync(manifestPath, 'utf8');

    // Simple regex check for the flag default
    const match = manifest.match(/name:\s*NARRATIVE_OPS_ANALYZER\s*\n\s*default:\s*0/);
    assert.ok(match, 'NARRATIVE_OPS_ANALYZER should be default 0 in manifest');
});
