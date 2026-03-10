import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { analyzeDependencies } from '../src/dependencyAnalyzer.js';
import { computeDrift } from '../src/driftEngine.js';
import { buildRepoGraph } from '../src/repoGraph.js';
import { predictCIRisk } from '../src/riskModel.js';

test('buildRepoGraph extracts imports and dependency hotspots', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'summit-intel-'));
  const srcDir = path.join(tmp, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(path.join(srcDir, 'a.ts'), "import x from './b';\nimport z from 'zod';\n");
  fs.writeFileSync(path.join(srcDir, 'b.ts'), "export * from './c';\n");
  fs.writeFileSync(path.join(srcDir, 'c.ts'), 'export const c = 1;\n');

  const graph = buildRepoGraph(tmp);
  const deps = analyzeDependencies(graph, 0);

  assert.equal(graph.modules.length, 3);
  assert.ok(Object.keys(deps.fanIn).includes('./b'));
  assert.ok(deps.highRisk.length >= 1);
});

test('drift and risk model return bounded signal', () => {
  const previous = { modules: [{ file: 'a.ts', imports: ['./x'] }], generatedAt: new Date().toISOString() };
  const current = {
    modules: [
      { file: 'a.ts', imports: ['./x', './y'] },
      { file: 'b.ts', imports: ['lodash'] },
    ],
    generatedAt: new Date().toISOString(),
  };

  const drift = computeDrift(previous, current);
  const risk = predictCIRisk({
    newDependencies: drift.newDependencies,
    highRiskDeps: 2,
    driftScore: drift.driftScore,
    changedFiles: 80,
  });

  assert.equal(drift.newDependencies, 2);
  assert.ok(risk.probability <= 1);
  assert.match(risk.grade, /LOW|MEDIUM|HIGH/);
});
