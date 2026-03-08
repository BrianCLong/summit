"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const catalog_js_1 = require("../catalog.js");
const canonical_js_1 = require("../canonical.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Error Catalog', () => {
    (0, globals_1.it)('should have unique error codes', () => {
        const codes = new Set();
        const duplicates = new Set();
        for (const key of Object.keys(catalog_js_1.MasterErrorCatalog)) {
            const error = catalog_js_1.MasterErrorCatalog[key];
            if (codes.has(error.code)) {
                duplicates.add(error.code);
            }
            codes.add(error.code);
        }
        (0, globals_1.expect)(duplicates.size).toBe(0);
    });
    (0, globals_1.it)('should have properly formatted error codes (E followed by 4 digits)', () => {
        for (const key of Object.keys(catalog_js_1.MasterErrorCatalog)) {
            const error = catalog_js_1.MasterErrorCatalog[key];
            (0, globals_1.expect)(error.code).toMatch(/^E\d{4}$/);
        }
    });
    (0, globals_1.it)('should have valid status codes', () => {
        for (const key of Object.keys(catalog_js_1.MasterErrorCatalog)) {
            const error = catalog_js_1.MasterErrorCatalog[key];
            (0, globals_1.expect)(error.status).toBeGreaterThanOrEqual(400);
            (0, globals_1.expect)(error.status).toBeLessThan(600);
        }
    });
    (0, globals_1.it)('should have remediation steps', () => {
        for (const key of Object.keys(catalog_js_1.MasterErrorCatalog)) {
            const error = catalog_js_1.MasterErrorCatalog[key];
            (0, globals_1.expect)(error.remediation).toBeTruthy();
            (0, globals_1.expect)(error.remediation.length).toBeGreaterThan(0);
        }
    });
});
(0, globals_1.describe)('CanonicalError', () => {
    (0, globals_1.it)('should be instantiable from catalog key', () => {
        const err = new canonical_js_1.CanonicalError('AUTH_INVALID_TOKEN');
        (0, globals_1.expect)(err).toBeInstanceOf(canonical_js_1.CanonicalError);
        (0, globals_1.expect)(err.code).toBe('E1001');
        (0, globals_1.expect)(err.statusCode).toBe(401);
        (0, globals_1.expect)(err.message).toBe('Invalid authentication token provided.');
        (0, globals_1.expect)(err.remediation).toBe('Please refresh your token or log in again.');
    });
    (0, globals_1.it)('should attach details', () => {
        const err = new canonical_js_1.CanonicalError('VALIDATION_BAD_INPUT', { field: 'email', reason: 'invalid format' });
        (0, globals_1.expect)(err.context.metadata).toEqual({ field: 'email', reason: 'invalid format' });
    });
    (0, globals_1.it)('should serialize correctly', () => {
        const err = new canonical_js_1.CanonicalError('RESOURCE_NOT_FOUND');
        const json = err.toJSON();
        (0, globals_1.expect)(json).toHaveProperty('code', 'E3001');
        (0, globals_1.expect)(json).toHaveProperty('remediation');
    });
});
