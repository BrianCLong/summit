import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
const expect = (actual) => ({ toBe: (expected) => assert.equal(actual, expected), toBeTrue: () => assert.equal(actual, true), toBeFalse: () => assert.equal(actual, false), toContain: (expected) => assert.ok(actual.includes(expected)), toBeCloseTo: (expected) => assert.ok(Math.abs(actual - expected) < 0.001), toMatch: (expected) => assert.match(actual, expected), toBeTruthy: () => assert.ok(actual) });
import { computeDivergenceMetrics } from '../pipeline/computeMetrics.ts';


  test('emits divergence score when type is contradicts', () => {
    const asOf = new Date().toISOString();
    const out = computeDivergenceMetrics(
      [
        {
          id: 'link_1234',
          narrativeId: 'narrative_1',
          claimId: 'claim_1',
          type: 'contradicts',
          score: 0.8,
          observedAt: asOf,
          provenance: { artifactIds: [] },
        },
      ],
      asOf,
    );

    expect(out[0]?.divergenceScore).toBeCloseTo(0.8);
  });
