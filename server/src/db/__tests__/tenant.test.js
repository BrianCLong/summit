"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const tenant_js_1 = require("../tenant.js");
(0, globals_1.describe)('withTenant', () => {
    (0, globals_1.it)('should append WHERE clause if none exists', () => {
        const query = 'SELECT * FROM users';
        const result = (0, tenant_js_1.withTenant)(query, [], 'tenant1');
        (0, globals_1.expect)(result.text).toBe('SELECT * FROM users WHERE tenant_id = $1');
        (0, globals_1.expect)(result.values).toEqual(['tenant1']);
    });
    (0, globals_1.it)('should append AND clause if WHERE exists', () => {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = (0, tenant_js_1.withTenant)(query, ['123'], 'tenant1');
        (0, globals_1.expect)(result.text).toBe('SELECT * FROM users WHERE id = $1 AND tenant_id = $2');
        (0, globals_1.expect)(result.values).toEqual(['123', 'tenant1']);
    });
    (0, globals_1.it)('should insert WHERE clause before ORDER BY', () => {
        const query = 'SELECT * FROM users ORDER BY created_at DESC';
        const result = (0, tenant_js_1.withTenant)(query, [], 'tenant1');
        (0, globals_1.expect)(result.text).toBe('SELECT * FROM users WHERE tenant_id = $1 ORDER BY created_at DESC');
    });
    (0, globals_1.it)('should insert AND clause before LIMIT', () => {
        const query = 'SELECT * FROM users WHERE active = true LIMIT 10';
        const result = (0, tenant_js_1.withTenant)(query, [], 'tenant1');
        (0, globals_1.expect)(result.text).toBe('SELECT * FROM users WHERE active = true AND tenant_id = $1 LIMIT 10');
    });
    (0, globals_1.it)('should handle multiple clauses', () => {
        const query = 'SELECT * FROM users WHERE active = true GROUP BY role ORDER BY created_at DESC LIMIT 5';
        const result = (0, tenant_js_1.withTenant)(query, [], 'tenant1');
        // It should insert before the first clause found (GROUP BY)
        (0, globals_1.expect)(result.text).toBe('SELECT * FROM users WHERE active = true AND tenant_id = $1 GROUP BY role ORDER BY created_at DESC LIMIT 5');
    });
    (0, globals_1.it)('should handle trailing semicolon', () => {
        const query = 'SELECT * FROM users;';
        const result = (0, tenant_js_1.withTenant)(query, [], 'tenant1');
        (0, globals_1.expect)(result.text).toBe('SELECT * FROM users WHERE tenant_id = $1;');
    });
    (0, globals_1.it)('should handle trailing semicolon with WHERE', () => {
        const query = 'SELECT * FROM users WHERE id = 1;';
        const result = (0, tenant_js_1.withTenant)(query, [], 'tenant1');
        (0, globals_1.expect)(result.text).toBe('SELECT * FROM users WHERE id = 1 AND tenant_id = $1;');
    });
});
