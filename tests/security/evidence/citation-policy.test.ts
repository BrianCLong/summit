import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertEvidenceId } from '../../../src/evidence/policies/citationPolicy';

describe('Citation Policy Security', () => {
  it('should reject invalid evidence ID', () => {
    assert.throws(() => assertEvidenceId('invalid-id'), /Invalid evidence id/);
  });
});
