import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import fc from 'fast-check';
import { checkScope, requireScopes } from '../../src/api/scopeGuard.js';

const SCOPES = [
  'read:graph',
  'write:case',
  'run:analytics',
  'export:bundle',
  'manage:keys',
] as const;

describe('scope guard fuzzing', () => {
  test('wildcard grants cover nested scopes', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SCOPES), (requested: string) => {
        const resource = requested.split(':')[0];
        const userScopes = [`${resource}:*`];

        expect(checkScope(userScopes, requested)).toBe(true);
        expect(() => requireScopes(userScopes as any, [requested as any])).not.toThrow();
      }),
      { numRuns: 30 },
    );
  });

  test('missing resource scope fails fast', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SCOPES),
        fc.constantFrom(...SCOPES),
        (needed: string, unrelated: string) => {
          fc.pre(needed.split(':')[0] !== unrelated.split(':')[0]);
          expect(() => requireScopes([unrelated as any], [needed as any])).toThrow(/SCOPE_DENIED/);
        },
      ),
      { numRuns: 30 },
    );
  });

  test('explicit grants override noisy scope lists', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SCOPES),
        fc.array(fc.constantFrom(...SCOPES), { minLength: 0, maxLength: 5 }),
        (needed: string, extraScopes: string[]) => {
          const grants = Array.from(new Set([...extraScopes, needed]));
          expect(() => requireScopes(grants as any, [needed as any])).not.toThrow();
        },
      ),
      { numRuns: 30 },
    );
  });
});
