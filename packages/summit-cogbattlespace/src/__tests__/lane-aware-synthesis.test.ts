import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
const expect = (actual) => ({ toBe: (expected) => assert.equal(actual, expected), toBeTrue: () => assert.equal(actual, true), toBeFalse: () => assert.equal(actual, false), toContain: (expected) => assert.ok(actual.includes(expected)), toBeCloseTo: (expected) => assert.ok(Math.abs(actual - expected) < 0.001), toMatch: (expected) => assert.match(actual, expected), toBeTruthy: () => assert.ok(actual) });
import { synthesizeLaneAwareAnswer } from "../synthesis/synthesize";

test("observed-only support refuses canonical tone", () => {
  const out = synthesizeLaneAwareAnswer({
    lanePolicy: "OBSERVED_AND_UP",
    hits: [
      {
        id: "n1",
        entityType: "Narrative",
        score: 0.8,
        payload: { label: "Emerging narrative" },
        provenance: {
          lane: "OBSERVED",
          trustScore: 0.62,
          confidenceScore: 0.58
        }
      }
    ],
    diagnostics: {
      filteredByLane: 0,
      returned: 1,
      mode: "HYBRID"
    }
  });

  expect(out.claims[0].refusal?.shouldRefuseCanonicalTone).toBe(true);
  expect(out.overallMode).toBe("CAUTIOUS");
});

test("promoted support allows canonical framing", () => {
  const out = synthesizeLaneAwareAnswer({
    lanePolicy: "PROMOTED_ONLY",
    hits: [
      {
        id: "n2",
        entityType: "Narrative",
        score: 0.95,
        payload: { label: "Canonical narrative state" },
        provenance: {
          lane: "PROMOTED",
          trustScore: 0.95,
          confidenceScore: 0.92,
          attested: true
        }
      }
    ],
    diagnostics: {
      filteredByLane: 0,
      returned: 1,
      mode: "HYBRID"
    }
  });

  expect(out.claims[0].refusal?.shouldRefuseCanonicalTone).toBe(false);
  expect(out.overallMode).toBe("CANONICAL");
});
