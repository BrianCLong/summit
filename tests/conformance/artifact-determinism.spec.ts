import { describe, it } from 'node:test';
import assert from 'node:assert';
import { checkArtifactDeterminism } from '../../evaluation/conformance/artifact-determinism';
import { canonicalizeJson } from '../../evaluation/utils/canonical-json';

describe('Artifact Determinism Tests', () => {
  it('should pass deterministic artifacts', () => {
    const artifact = {
      id: "agent-1",
      steps: ["step1", "step2"],
      metadata: {
        version: "1.0",
        type: "evaluation"
      }
    };

    const result = checkArtifactDeterminism(artifact);
    assert.strictEqual(result.isDeterministic, true);
    assert.strictEqual(result.violations.length, 0);
  });

  it('should flag artifacts with timestamps', () => {
    const artifact = {
      id: "agent-1",
      timestamp: "2023-10-24T12:00:00Z"
    };

    const result = checkArtifactDeterminism(artifact);
    assert.strictEqual(result.isDeterministic, false);
    assert.ok(result.violations.includes("Found timestamp in artifact"));
  });

  it('should flag artifacts with UUIDs', () => {
    const artifact = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      data: "something"
    };

    const result = checkArtifactDeterminism(artifact);
    assert.strictEqual(result.isDeterministic, false);
    assert.ok(result.violations.includes("Found non-deterministic ID (UUID) in artifact"));
  });

  it('canonicalizeJson should order keys deterministically', () => {
    const obj1 = { a: 1, b: 2, c: 3 };
    const obj2 = { c: 3, a: 1, b: 2 };

    assert.strictEqual(canonicalizeJson(obj1), canonicalizeJson(obj2));
  });
});
