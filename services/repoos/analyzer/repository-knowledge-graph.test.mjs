import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRepositoryKnowledgeGraph,
  persistRepositoryKnowledgeGraph,
} from './repository-knowledge-graph.mjs';

function withTempRepo(run) {
  const repoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'repoos-rkg-'));

  try {
    run(repoPath);
  } finally {
    fs.rmSync(repoPath, { recursive: true, force: true });
  }
}

test('buildRepositoryKnowledgeGraph captures contains and imports edges', () => {
  withTempRepo((repoPath) => {
    fs.mkdirSync(path.join(repoPath, 'src', 'auth'), { recursive: true });
    fs.writeFileSync(
      path.join(repoPath, 'src', 'api.ts'),
      "import { session } from './auth/session';\nexport const api = session;\n",
      'utf8'
    );
    fs.writeFileSync(path.join(repoPath, 'src', 'auth', 'session.ts'), 'export const session = true;\n', 'utf8');

    const graph = buildRepositoryKnowledgeGraph(repoPath);

    const importEdge = graph.edges.find(
      (edge) =>
        edge.type === 'imports' && edge.from === 'src/api.ts' && edge.to === 'src/auth/session.ts'
    );
    assert.ok(importEdge);

    const directoryContains = graph.edges.find(
      (edge) => edge.type === 'contains' && edge.from === 'src' && edge.to === 'src/api.ts'
    );
    assert.ok(directoryContains);
  });
});

test('buildRepositoryKnowledgeGraph links pull requests to developers and files', () => {
  withTempRepo((repoPath) => {
    fs.writeFileSync(path.join(repoPath, 'index.ts'), 'export {}\n', 'utf8');

    const graph = buildRepositoryKnowledgeGraph(repoPath, {
      pullRequests: [
        {
          id: '42',
          author: 'alice',
          files: ['index.ts'],
        },
      ],
    });

    assert.ok(graph.nodes.find((node) => node.id === 'pr:42' && node.type === 'pull_request'));
    assert.ok(graph.nodes.find((node) => node.id === 'dev:alice' && node.type === 'developer'));
    assert.ok(
      graph.edges.find(
        (edge) => edge.type === 'authored_by' && edge.from === 'pr:42' && edge.to === 'dev:alice'
      )
    );
    assert.ok(
      graph.edges.find(
        (edge) => edge.type === 'modifies' && edge.from === 'pr:42' && edge.to === 'index.ts'
      )
    );

    const outputPath = persistRepositoryKnowledgeGraph(graph, repoPath);
    assert.ok(fs.existsSync(outputPath));
  });
});
