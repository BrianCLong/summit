import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateArtifactId } from '../security.js'; // Import from local file

describe('validateArtifactId', () => {
  it('should return true for simple filenames', () => {
    assert.strictEqual(validateArtifactId('file.txt'), true);
    assert.strictEqual(validateArtifactId('data.json'), true);
    assert.strictEqual(validateArtifactId(undefined), true);
  });

  it('should return false for relative paths', () => {
    assert.strictEqual(validateArtifactId('../file.txt'), false);
    assert.strictEqual(validateArtifactId('a/b.txt'), false);
  });

  it('should return false for absolute paths', () => {
    assert.strictEqual(validateArtifactId('/etc/passwd'), false);
  });
});
