import path from 'path';
import { verifyBundle } from '../../scripts/bundle/verify';

describe('bundle verification', () => {
  const fixtures = path.join(__dirname, 'fixtures');

  it('verifies a valid bundle with placeholder signature', () => {
    const result = verifyBundle(path.join(fixtures, 'valid-bundle'));
    expect(result.ok).toBe(true);
    expect(result.signatureVerified).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.checkedFiles.sort()).toEqual(['README.md', 'index.js']);
  });

  it('detects hash mismatches', () => {
    const result = verifyBundle(path.join(fixtures, 'tampered-bundle'));
    expect(result.ok).toBe(false);
    expect(result.errors.some((err) => err.includes('Hash mismatch'))).toBe(true);
  });

  it('detects signature mismatch', () => {
    const result = verifyBundle(path.join(fixtures, 'invalid-signature-bundle'));
    expect(result.ok).toBe(false);
    expect(result.errors.some((err) => err.includes('Signature verification failed'))).toBe(true);
  });

  it('requires a signature when configured', () => {
    const result = verifyBundle(path.join(fixtures, 'unsigned-bundle'), { requireSignature: true });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Signature is required but signature.json was not found.');
  });
});
