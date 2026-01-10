import fc from 'fast-check';
import { checkScope, requireScopes, type Scope } from '../../src/api/scopeGuard.js';

const SCOPES: Scope[] = [
  'read:graph',
  'write:case',
  'run:analytics',
  'export:bundle',
  'manage:keys',
];

describe('scope guard fuzzing', () => {
  test('wildcard grants cover nested scopes', () => {
    fc.assert(
      fc.property(fc.constantFrom<Scope>(...SCOPES), (requested: Scope) => {
        const resource = requested.split(':')[0];
        const userScopes = [`${resource}:*`];

        expect(checkScope(userScopes, requested)).toBe(true);
        expect(() => requireScopes(userScopes, [requested])).not.toThrow();
      }),
      { numRuns: 30 },
    );
  });

  test('missing resource scope fails fast', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Scope>(...SCOPES),
        fc.constantFrom<Scope>(...SCOPES),
        (needed: Scope, unrelated: Scope) => {
          fc.pre(needed.split(':')[0] !== unrelated.split(':')[0]);
          expect(() => requireScopes([unrelated], [needed])).toThrow(/SCOPE_DENIED/);
        },
      ),
      { numRuns: 30 },
    );
  });

  test('explicit grants override noisy scope lists', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Scope>(...SCOPES),
        fc.array(fc.constantFrom<Scope>(...SCOPES), { minLength: 0, maxLength: 5 }),
        (needed: Scope, extraScopes: Scope[]) => {
          const grants = Array.from(new Set([...extraScopes, needed]));
          expect(() => requireScopes(grants, [needed])).not.toThrow();
        },
      ),
      { numRuns: 30 },
    );
  });
});
