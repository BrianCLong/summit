import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildGraph, writeGraph } from '../repo-graph-builder.mjs';

function createFixtureRepo() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-graph-builder-'));

  fs.mkdirSync(path.join(tempRoot, 'apps', 'web'), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, 'packages', 'shared'), { recursive: true });

  fs.writeFileSync(
    path.join(tempRoot, 'apps', 'web', 'package.json'),
    JSON.stringify(
      {
        name: '@summit/web',
        version: '1.2.3',
        dependencies: {
          react: '^18.0.0',
          '@summit/shared': 'workspace:*',
        },
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(tempRoot, 'packages', 'shared', 'package.json'),
    JSON.stringify(
      {
        name: '@summit/shared',
        version: '0.4.0',
      },
      null,
      2,
    ),
  );

  return tempRoot;
}

test('buildGraph creates modules, dependencies, and containment relationships', () => {
  const fixtureRoot = createFixtureRepo();
  const graph = buildGraph(fixtureRoot);

  const moduleNodes = graph.nodes.filter((node) => node.type === 'module');
  const dependencyNodes = graph.nodes.filter((node) => node.type === 'dependency');
  const containsEdges = graph.relationships.filter((rel) => rel.type === 'contains');
  const dependencyEdges = graph.relationships.filter((rel) => rel.type === 'depends_on');

  assert.equal(moduleNodes.length, 2);
  assert.equal(containsEdges.length, 2);
  assert.equal(dependencyNodes.length, 2);
  assert.equal(dependencyEdges.length, 2);

  const moduleNames = new Set(moduleNodes.map((node) => node.name));
  assert(moduleNames.has('@summit/web'));
  assert(moduleNames.has('@summit/shared'));
});

test('writeGraph persists json artifact to requested path', () => {
  const fixtureRoot = createFixtureRepo();
  const graph = buildGraph(fixtureRoot);

  const outputPath = writeGraph(graph, '.repoos/graph/repository-graph.json', fixtureRoot);

  assert(fs.existsSync(outputPath));
  const persisted = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(persisted.nodeCount, graph.nodeCount);
  assert.equal(persisted.relationshipCount, graph.relationshipCount);
});
