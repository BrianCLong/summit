import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { computeCountDelta, computeDigestDiff } from '../graph_postgres_drift_check.mjs';

describe('graph_postgres_drift_check', () => {
  test('computeCountDelta returns zero when both counts are zero', () => {
    const { delta, deltaPct } = computeCountDelta(0, 0);
    assert.equal(delta, 0);
    assert.equal(deltaPct, 0);
  });

  test('computeCountDelta handles non-zero baseline', () => {
    const { delta, deltaPct } = computeCountDelta(100, 90);
    assert.equal(delta, 10);
    assert.equal(deltaPct, 10);
  });

  test('computeDigestDiff identifies missing, extra, and mismatched IDs', () => {
    const postgresRows = [
      { id: '1', digest: 'aaa' },
      { id: '2', digest: 'bbb' },
      { id: '3', digest: 'ccc' }
    ];
    const neo4jRows = [
      { id: '1', digest: 'aaa' },
      { id: '2', digest: 'zzz' },
      { id: '4', digest: 'ddd' }
    ];

    const diff = computeDigestDiff(postgresRows, neo4jRows, 10);
    assert.deepEqual(diff.missingInGraph, ['3']);
    assert.deepEqual(diff.extraInGraph, ['4']);
    assert.equal(diff.mismatched.length, 1);
    assert.equal(diff.mismatched[0].id, '2');
    assert.equal(diff.totals.missing_in_graph, 1);
    assert.equal(diff.totals.extra_in_graph, 1);
    assert.equal(diff.totals.mismatched, 1);
  });

  test('computeDigestDiff respects detail limit', () => {
    const postgresRows = [
      { id: '1', digest: 'aaa' },
      { id: '2', digest: 'bbb' },
      { id: '3', digest: 'ccc' }
    ];
    const neo4jRows = [];

    const diff = computeDigestDiff(postgresRows, neo4jRows, 1);
    assert.equal(diff.missingInGraph.length, 1);
    assert.equal(diff.totals.missing_in_graph, 3);
  });
});
