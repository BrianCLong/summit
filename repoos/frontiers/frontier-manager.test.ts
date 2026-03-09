import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { FrontierManager, Patch } from './frontier-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('FrontierManager processes patches and groups by concern', async (t) => {
  const testStateFile = path.join(__dirname, 'test-frontier-state.json');
  const testReportFile = path.join(__dirname, 'frontier-synthesis-report.json');

  // Clean up previous test runs if any
  if (fs.existsSync(testStateFile)) fs.unlinkSync(testStateFile);
  if (fs.existsSync(testReportFile)) fs.unlinkSync(testReportFile);

  // Initialize state file
  fs.writeFileSync(testStateFile, JSON.stringify({
    frontiers: {
      ci: { branch: 'frontier/ci', patches: [] },
      runtime: { branch: 'frontier/runtime', patches: [] },
      security: { branch: 'frontier/security', patches: [] }
    }
  }, null, 2));

  const manager = new FrontierManager(testStateFile);

  const patches: Patch[] = [
    { id: 'p1', concern: 'ci', description: 'Fix test action', diff: 'diff1' },
    { id: 'p2', concern: 'ci', description: 'Update runner', diff: 'diff2' },
    { id: 'p3', concern: 'security', description: 'Bump deps', diff: 'diff3' }
  ];

  patches.forEach(p => manager.processPatch(p));
  manager.generateReport(testReportFile);

  // Verify State
  const stateData = JSON.parse(fs.readFileSync(testStateFile, 'utf8'));
  assert.strictEqual(stateData.frontiers.ci.patches.length, 2, 'CI concern should have 2 patches');
  assert.strictEqual(stateData.frontiers.security.patches.length, 1, 'Security concern should have 1 patch');
  assert.strictEqual(stateData.frontiers.runtime.patches.length, 0, 'Runtime concern should have 0 patches');

  // Verify Report
  assert.ok(fs.existsSync(testReportFile), 'Synthesis report should be generated');
  const reportData = JSON.parse(fs.readFileSync(testReportFile, 'utf8'));
  const ciSummary = reportData.summary.find((s: any) => s.concern === 'ci');
  assert.strictEqual(ciSummary.patchCount, 2, 'Report should reflect 2 CI patches');

  // Clean up
  if (fs.existsSync(testStateFile)) fs.unlinkSync(testStateFile);
  if (fs.existsSync(testReportFile)) fs.unlinkSync(testReportFile);
});
