import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { analyzeRepository, formatReport, isRemoteSource } from '../src/analyze.js';

test('isRemoteSource recognizes git and http remotes', () => {
  assert.equal(isRemoteSource('https://github.com/vercel/next.js'), true);
  assert.equal(isRemoteSource('git@github.com:user/repo.git'), true);
  assert.equal(isRemoteSource('./local-repo'), false);
});

test('analyzeRepository returns summary for local path', async () => {
  const repo = await mkdtemp(join(tmpdir(), 'summit-intel-test-'));
  await mkdir(join(repo, 'src'));
  await mkdir(join(repo, 'server'));
  await writeFile(join(repo, 'src', 'index.ts'), 'export const value = 1;\n');
  await writeFile(join(repo, 'server', 'api.js'), 'module.exports = {};\n');

  const summary = await analyzeRepository(repo);

  assert.equal(summary.modulesAnalyzed >= 2, true);
  assert.equal(summary.highRiskDependencyClusters >= 1, true);
  assert.equal(summary.architectureHealth > 0, true);
});

test('formatReport emits user-facing intelligence report', () => {
  const output = formatReport('demo/repo', {
    modulesAnalyzed: 12,
    highRiskDependencyClusters: 2,
    dependencyRisk: 'Moderate',
    architectureHealth: 78,
    ciInstabilityProbability: 24,
  });

  assert.match(output, /Repository Intelligence/);
  assert.match(output, /Modules analyzed: 12/);
  assert.match(output, /Architecture health: 78 \/ 100/);
});
