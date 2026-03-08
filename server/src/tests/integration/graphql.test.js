"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('GraphQL contract placeholder', () => {
    (0, globals_1.it)('returns a stable version payload', () => {
        const response = {
            data: { ok: true, version: 'test-1.0.0' },
            errors: undefined,
        };
        (0, globals_1.expect)(response.errors).toBeUndefined();
        (0, globals_1.expect)(response.data.ok).toBe(true);
        (0, globals_1.expect)(response.data.version).toMatch(/^test-/);
    });
});
