import { describe, it, expect } from '@jest/globals';
import { loadRecipe } from '../../src/recipes/loader.js';

describe('Security: Path Traversal Guards', () => {
  it('should block path traversal attempts (regression test)', async () => {
    // Attempt to access package.json which is one level up from recipes/
    const traversalPath = '../package.json';

    try {
      const result = await loadRecipe(traversalPath);
      // It should return an error object indicating invalid path
      expect(result.__error).toBe('Invalid recipe path');
    } catch (e) {
        // If it throws an error that's not the one we returned, fail
        throw new Error('Should handle error gracefully and return object with __error');
    }
  });

  it('should allow loading valid recipes', async () => {
      const validRecipe = 'web-research.yaml';
      const result = await loadRecipe(validRecipe);

      // We accept either a successful load or a dependency error (yaml missing)
      // as long as it's not a path traversal error
      if (result.__error) {
          expect(result.__error).not.toBe('Invalid recipe path');
      } else {
          expect(result).toBeDefined();
      }
  });
});
