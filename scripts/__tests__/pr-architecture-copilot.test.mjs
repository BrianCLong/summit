import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const FIXTURE = '.repoos/pr-analysis/test-files.json';

test('pr architecture copilot generates expected artifacts', () => {
  fs.mkdirSync('.repoos/pr-analysis', { recursive: true });
  fs.writeFileSync(
    FIXTURE,
    JSON.stringify([
      {
        filename: 'ingestion/collector.ts',
        status: 'modified',
        additions: 12,
        deletions: 2,
        changes: 14,
        patch: "@@\n+import { buildMetric } from 'analytics/core';\n+import lodash from 'lodash';\n",
      },
      {
        filename: 'analytics/core.ts',
        status: 'modified',
        additions: 10,
        deletions: 1,
        changes: 11,
        patch: "@@\n+import { collect } from 'ingestion/collector';\n",
      },
    ]),
  );

  execFileSync('node', ['scripts/pr-architecture-copilot.mjs', '--files-json', FIXTURE], { stdio: 'pipe' });

  const risk = JSON.parse(fs.readFileSync('.repoos/pr-analysis/risk-score.json', 'utf8'));
  const deps = JSON.parse(fs.readFileSync('.repoos/pr-analysis/dependency-impact.json', 'utf8'));
  const evidence = JSON.parse(fs.readFileSync('.repoos/evidence/pr-architecture-copilot-report.json', 'utf8'));

  assert.equal(deps.circularDependencyRisk, 'detected');
  assert.ok(risk.score > 0);
  assert.equal(evidence.deterministic, true);
});
