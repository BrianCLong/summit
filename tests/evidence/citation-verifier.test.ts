import { describe, it } from 'node:test';
import assert from 'node:assert';
import { verifyCitation } from '../../src/evidence/verify/citationVerifier';

describe('CitationVerifier', () => {
  it('should verify citation', () => {
    const result = verifyCitation('locator', 'normalizedText');
    assert.strictEqual(result.verificationStatus, 'verified');
  });
});
