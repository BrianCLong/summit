
import { jest } from '@jest/globals';
import { requireScopes } from '../src/api/scopeGuard.js';

// Mock dependencies if needed, but here we are testing logic

describe('Scope Guard', () => {
  describe('requireScopes', () => {
    it('should pass if user has all required scopes', () => {
      const userScopes = ['read:graph', 'write:case'];
      expect(() => requireScopes(userScopes, ['read:graph'])).not.toThrow();
      expect(() => requireScopes(userScopes, ['read:graph', 'write:case'])).not.toThrow();
    });

    it('should pass if user has wildcard scope', () => {
      const userScopes = ['read:*'];
      expect(() => requireScopes(userScopes, ['read:graph'])).not.toThrow();
    });

    it('should throw SCOPE_DENIED if user misses a scope', () => {
      const userScopes = ['read:graph'];
      try {
        requireScopes(userScopes, ['write:case']);
      } catch (e: any) {
        expect(e.message).toBe('SCOPE_DENIED:write:case');
        expect(e.code).toBe('SCOPE_DENIED');
      }
    });

    it('should throw if user has no scopes', () => {
        const userScopes: string[] = [];
        try {
            requireScopes(userScopes, ['read:graph']);
        } catch (e: any) {
            expect(e.code).toBe('SCOPE_DENIED');
        }
    });
  });
});
