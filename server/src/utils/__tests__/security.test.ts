import { describe, it, expect } from '@jest/globals';
import { validateArtifactId } from '../security.js';

describe('validateArtifactId', () => {
  it('should return true for simple filenames', () => {
    expect(validateArtifactId('file.txt')).toBe(true);
    expect(validateArtifactId('data.json')).toBe(true);
    expect(validateArtifactId(undefined)).toBe(true);
  });

  it('should return false for relative paths', () => {
    expect(validateArtifactId('../file.txt')).toBe(false);
    expect(validateArtifactId('a/b.txt')).toBe(false);
  });

  it('should return false for absolute paths', () => {
    expect(validateArtifactId('/etc/passwd')).toBe(false);
  });
});
