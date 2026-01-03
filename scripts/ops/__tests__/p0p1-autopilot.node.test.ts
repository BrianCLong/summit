import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

test('P0/P1 Autopilot Offline Mode', async (t) => {
  const scriptPath = path.resolve('scripts/ops/p0p1-autopilot.ts');
  const fixturesDir = path.resolve('scripts/ops/fixtures');
  const outputReport = path.resolve('docs/ops/P0P1_AUTOPILOT.md');
  const workstreamsDir = path.resolve('workstreams');

  // Clean up before run
  if (fs.existsSync(outputReport)) fs.unlinkSync(outputReport);
  if (fs.existsSync(workstreamsDir)) fs.rmSync(workstreamsDir, { recursive: true, force: true });

  await t.test('Generates report and manifests from fixtures', () => {
    execSync(`npx tsx ${scriptPath} --mode=offline --fixturesDir=${fixturesDir}`, { stdio: 'inherit' });

    assert.ok(fs.existsSync(outputReport), 'Report file should exist');
    assert.ok(fs.existsSync(workstreamsDir), 'Workstreams directory should exist');

    // Check for at least 3 agents (Claude, Codex, Qwen, Jules)
    const agents = fs.readdirSync(workstreamsDir);
    assert.ok(agents.length >= 3, 'Should generate manifests for at least 3 agents');

    // Check specific agent manifest
    const codexManifests = fs.readdirSync(path.join(workstreamsDir, 'Codex'));
    assert.ok(codexManifests.length > 0, 'Codex should have workstreams');

    // Read a manifest and verify structure
    const manifestPath = path.join(workstreamsDir, 'Codex', codexManifests[0]);
    // It's YAML now, but simple YAML is somewhat parseable, or checking content string
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    assert.ok(manifestContent.includes('agent: Codex'));
    assert.ok(manifestContent.includes('workstream_id:'));
  });
});
