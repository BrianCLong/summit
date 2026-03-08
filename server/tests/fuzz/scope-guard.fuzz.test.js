"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fast_check_1 = __importDefault(require("fast-check"));
const scopeGuard_js_1 = require("../../src/api/scopeGuard.js");
const SCOPES = [
    'read:graph',
    'write:case',
    'run:analytics',
    'export:bundle',
    'manage:keys',
];
(0, globals_1.describe)('scope guard fuzzing', () => {
    test('wildcard grants cover nested scopes', () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom(...SCOPES), (requested) => {
            const resource = requested.split(':')[0];
            const userScopes = [`${resource}:*`];
            (0, globals_1.expect)((0, scopeGuard_js_1.checkScope)(userScopes, requested)).toBe(true);
            (0, globals_1.expect)(() => (0, scopeGuard_js_1.requireScopes)(userScopes, [requested])).not.toThrow();
        }), { numRuns: 30 });
    });
    test('missing resource scope fails fast', () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom(...SCOPES), fast_check_1.default.constantFrom(...SCOPES), (needed, unrelated) => {
            fast_check_1.default.pre(needed.split(':')[0] !== unrelated.split(':')[0]);
            (0, globals_1.expect)(() => (0, scopeGuard_js_1.requireScopes)([unrelated], [needed])).toThrow(/SCOPE_DENIED/);
        }), { numRuns: 30 });
    });
    test('explicit grants override noisy scope lists', () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom(...SCOPES), fast_check_1.default.array(fast_check_1.default.constantFrom(...SCOPES), { minLength: 0, maxLength: 5 }), (needed, extraScopes) => {
            const grants = Array.from(new Set([...extraScopes, needed]));
            (0, globals_1.expect)(() => (0, scopeGuard_js_1.requireScopes)(grants, [needed])).not.toThrow();
        }), { numRuns: 30 });
    });
});
