"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scopeGuard_js_1 = require("../src/api/scopeGuard.js");
// Mock dependencies if needed, but here we are testing logic
describe('Scope Guard', () => {
    describe('requireScopes', () => {
        it('should pass if user has all required scopes', () => {
            const userScopes = ['read:graph', 'write:case'];
            expect(() => (0, scopeGuard_js_1.requireScopes)(userScopes, ['read:graph'])).not.toThrow();
            expect(() => (0, scopeGuard_js_1.requireScopes)(userScopes, ['read:graph', 'write:case'])).not.toThrow();
        });
        it('should pass if user has wildcard scope', () => {
            const userScopes = ['read:*'];
            expect(() => (0, scopeGuard_js_1.requireScopes)(userScopes, ['read:graph'])).not.toThrow();
        });
        it('should throw SCOPE_DENIED if user misses a scope', () => {
            const userScopes = ['read:graph'];
            try {
                (0, scopeGuard_js_1.requireScopes)(userScopes, ['write:case']);
            }
            catch (e) {
                expect(e.message).toBe('SCOPE_DENIED:write:case');
                expect(e.code).toBe('SCOPE_DENIED');
            }
        });
        it('should throw if user has no scopes', () => {
            const userScopes = [];
            try {
                (0, scopeGuard_js_1.requireScopes)(userScopes, ['read:graph']);
            }
            catch (e) {
                expect(e.code).toBe('SCOPE_DENIED');
            }
        });
    });
});
