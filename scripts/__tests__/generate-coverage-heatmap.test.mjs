import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateByService,
  computeCounts,
  deriveService,
  findCoverageFiles,
  normalizePath,
  parseCoverageFile,
  renderTopGaps
} from '../generate-coverage-heatmap.mjs';

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-heatmap-test-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('parseCoverageFile handles Istanbul detail metrics', () => {
  withTempDir((dir) => {
    const coveragePath = path.join(dir, 'coverage-final.json');
    fs.writeFileSync(
      coveragePath,
      JSON.stringify({
        total: {},
        '/repo/server/src/index.js': { s: { 1: 1, 2: 0 }, b: { 1: [0, 1] }, f: { 1: 1 } },
        '/repo/services/payments/index.js': { s: { 1: 0 }, b: { 1: [0, 0] }, f: { 1: 0 } }
      })
    );

    const metrics = parseCoverageFile(coveragePath);
    assert.equal(metrics.length, 2);
    assert.deepEqual(metrics[0].statements, { covered: 1, total: 2 });
    assert.equal(metrics[0].metricSource, 'detail');
  });
});

test('parseCoverageFile handles Istanbul summary metrics', () => {
  withTempDir((dir) => {
    const coveragePath = path.join(dir, 'coverage-summary.json');
    fs.writeFileSync(
      coveragePath,
      JSON.stringify({
        total: {},
        'server/index.js': {
          statements: { covered: 8, total: 10 },
          branches: { covered: 5, total: 6 },
          functions: { covered: 3, total: 4 }
        }
      })
    );

    const metrics = parseCoverageFile(coveragePath);
    assert.equal(metrics[0].metricSource, 'summary');
    assert.deepEqual(metrics[0].statements, { covered: 8, total: 10 });
  });
});

test('aggregateByService groups and sorts by coverage score', () => {
  const metrics = [
    {
      service: 'server',
      normalizedPath: 'server/a.js',
      sourceFile: 'a',
      statements: { covered: 2, total: 4 },
      branches: { covered: 1, total: 2 },
      functions: { covered: 1, total: 2 }
    },
    {
      service: 'server',
      normalizedPath: 'server/b.js',
      sourceFile: 'b',
      statements: { covered: 1, total: 1 },
      branches: { covered: 1, total: 1 },
      functions: { covered: 1, total: 1 }
    },
    {
      service: 'payments',
      normalizedPath: 'services/payments/a.js',
      sourceFile: 'c',
      statements: { covered: 0, total: 2 },
      branches: { covered: 0, total: 2 },
      functions: { covered: 0, total: 1 }
    }
  ];

  const grouped = aggregateByService(metrics);
  assert.equal(grouped[0].service, 'payments');
  assert.equal(grouped[1].service, 'server');
  assert.deepEqual(grouped[1].statements, { covered: 3, total: 5 });
});

test('renderTopGaps prioritizes highest uncovered statements and handles ties', () => {
  const metrics = [
    {
      service: 'a',
      normalizedPath: 'server/a.js',
      statements: { covered: 1, total: 5 },
      branches: { covered: 0, total: 1 },
      functions: { covered: 0, total: 1 }
    },
    {
      service: 'b',
      normalizedPath: 'server/b.js',
      statements: { covered: 4, total: 8 },
      branches: { covered: 1, total: 2 },
      functions: { covered: 1, total: 2 }
    }
  ];

  const rendered = renderTopGaps(metrics, 2);
  assert.ok(rendered.split('\n')[0].includes('a.js'));
});

test('computeCounts tallies booleans, arrays, and objects', () => {
  const result = computeCounts({ 1: 1, 2: 0, 3: [0, 1], 4: { a: 0, b: 2 } }, true);
  assert.deepEqual(result, { covered: 3, total: 6 });
});

test('normalizePath trims to anchor and deriveService extracts service name', () => {
  const normalized = normalizePath('/tmp/repo/services/auth/src/index.js');
  assert.equal(normalized, 'services/auth/src/index.js');
  assert.equal(deriveService(normalized), 'auth');
});

test('findCoverageFiles discovers coverage outputs within default roots', () => {
  withTempDir((dir) => {
    const serverDir = path.join(dir, 'server');
    const skipDir = path.join(dir, 'server', 'node_modules');
    fs.mkdirSync(skipDir, { recursive: true });
    fs.mkdirSync(path.join(serverDir, 'nested'), { recursive: true });
    const target = path.join(serverDir, 'nested', 'coverage-summary.json');
    fs.writeFileSync(target, JSON.stringify({}));
    fs.writeFileSync(path.join(skipDir, 'coverage-final.json'), JSON.stringify({}));

    const found = findCoverageFiles(dir, ['server']);
    assert.ok(found.includes(target));
    assert.ok(!found.includes(path.join(skipDir, 'coverage-final.json')));
  });
});
