"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const primitives_js_1 = require("./primitives.js");
(0, vitest_1.describe)('isolation primitives', () => {
    const tenantScope = { tenantId: 'tenant-123', compartments: ['alpha', 'bravo'] };
    (0, vitest_1.it)('requires tenant scope', () => {
        (0, vitest_1.expect)(() => (0, primitives_js_1.requireTenantScope)({})).toThrow(primitives_js_1.IsolationViolationError);
    });
    (0, vitest_1.it)('scopes SQL queries by injecting tenant clause', () => {
        const scoped = (0, primitives_js_1.scopeSqlToTenant)('SELECT * FROM runs', [], tenantScope);
        (0, vitest_1.expect)(scoped.text.toLowerCase()).toContain('where tenant_id');
        (0, vitest_1.expect)(scoped.values).toContain('tenant-123');
    });
    (0, vitest_1.it)('appends tenant guard to existing WHERE clauses before trailing clauses', () => {
        const scoped = (0, primitives_js_1.scopeSqlToTenant)('SELECT * FROM cases WHERE status = $1 ORDER BY created_at DESC', ['OPEN'], tenantScope);
        (0, vitest_1.expect)(scoped.text).toContain('AND tenant_id');
        (0, vitest_1.expect)(scoped.text).toContain('ORDER BY created_at DESC');
        (0, vitest_1.expect)(scoped.values[1]).toBe('tenant-123');
    });
    (0, vitest_1.it)('fails closed when tenants do not match', () => {
        (0, vitest_1.expect)(() => (0, primitives_js_1.assertTenantMatch)('other', tenantScope)).toThrow(primitives_js_1.IsolationViolationError);
    });
    (0, vitest_1.it)('requires explicit compartment membership', () => {
        (0, vitest_1.expect)(() => (0, primitives_js_1.enforceCompartments)(['charlie'], tenantScope)).toThrow(primitives_js_1.IsolationViolationError);
    });
    (0, vitest_1.it)('enforces service isolation across tenant and compartment boundaries', () => {
        (0, vitest_1.expect)(() => (0, primitives_js_1.assertServiceIsolation)({ tenant: tenantScope }, { tenantId: 'tenant-123', compartments: ['alpha'] }, { requireCompartments: true })).not.toThrow();
    });
    (0, vitest_1.it)('creates scoped parameter payloads for downstream calls', () => {
        const params = (0, primitives_js_1.createTenantScopedParams)(tenantScope, { resourceId: 'r1' });
        (0, vitest_1.expect)(params).toEqual({ resourceId: 'r1', tenantId: 'tenant-123', compartments: ['alpha', 'bravo'] });
    });
});
