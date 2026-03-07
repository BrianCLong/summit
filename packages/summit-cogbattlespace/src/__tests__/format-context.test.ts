import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
const expect = (actual) => ({ toBe: (expected) => assert.equal(actual, expected), toBeTrue: () => assert.equal(actual, true), toBeFalse: () => assert.equal(actual, false), toContain: (expected) => assert.ok(actual.includes(expected)), toBeCloseTo: (expected) => assert.ok(Math.abs(actual - expected) < 0.001), toMatch: (expected) => assert.match(actual, expected), toBeTruthy: () => assert.ok(actual) });
import { formatRetrievalContext } from "../retrieval/formatContext";

test("formats lane provenance in retrieval context", () => {
  const out = formatRetrievalContext({
    lanePolicy: "TRUSTED_AND_UP",
    diagnostics: { returned: 1, filteredByLane: 2, mode: "HYBRID" },
    hits: [
      {
        id: "n1",
        entityType: "Narrative",
        score: 0.91,
        payload: { label: "Example" },
        provenance: {
          lane: "TRUSTED",
          trustScore: 0.88,
          confidenceScore: 0.8,
          sourceTrustTier: "HIGH",
          provenanceStrength: "STRONG",
          attested: true
        }
      }
    ]
  });

  expect(out).toContain("lane=TRUSTED");
  expect(out).toContain("lanePolicy=TRUSTED_AND_UP");
});
