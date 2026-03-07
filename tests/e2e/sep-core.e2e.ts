import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertEvidenceId, buildDeterministicStamp } from '../../src/evidence/policies/citationPolicy';

describe('SEP Core E2E', () => {
  it('assertEvidenceId should validate correct IDs', () => {
    assertEvidenceId('EVID:sec:10k-2025-acme:7fa92d');
  });

  it('buildDeterministicStamp should return stamp', () => {
    const stamp = buildDeterministicStamp('1.0.0');
    assert.strictEqual(stamp.protocol, 'SEP');
    assert.strictEqual(stamp.version, '1.0.0');
  });
});
