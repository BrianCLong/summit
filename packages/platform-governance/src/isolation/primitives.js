"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenantScopedParams = exports.assertServiceIsolation = exports.enforceCompartments = exports.scopeSqlToTenant = exports.assertTenantMatch = exports.requireTenantScope = exports.IsolationViolationError = void 0;
class IsolationViolationError extends Error {
    boundary;
    details;
    constructor(message, boundary, details) {
        super(message);
        this.name = 'IsolationViolationError';
        this.boundary = boundary;
        this.details = details;
    }
}
exports.IsolationViolationError = IsolationViolationError;
const requireTenantScope = (scope) => {
    if (!scope?.tenantId) {
        throw new IsolationViolationError('Tenant scope is required for this operation.', 'tenant');
    }
    return {
        tenantId: scope.tenantId,
        compartments: scope.compartments ?? [],
        label: scope.label,
    };
};
exports.requireTenantScope = requireTenantScope;
const assertTenantMatch = (targetTenantId, scope, hint) => {
    const tenantScope = (0, exports.requireTenantScope)(scope);
    if (!targetTenantId || targetTenantId !== tenantScope.tenantId) {
        throw new IsolationViolationError(`Tenant boundary violation: expected ${tenantScope.tenantId} but received ${targetTenantId ?? 'unknown'}.`, 'tenant', hint ? { hint } : undefined);
    }
};
exports.assertTenantMatch = assertTenantMatch;
const scopeSqlToTenant = (query, params, scope, column = 'tenant_id') => {
    const tenantScope = (0, exports.requireTenantScope)(scope);
    const normalizedQuery = query.trim();
    const lower = normalizedQuery.toLowerCase();
    const lowerColumn = column.toLowerCase();
    const whereIndex = lower.indexOf(' where ');
    const hasTenantGuard = (whereIndex !== -1 && lower.slice(whereIndex).includes(lowerColumn)) ||
        new RegExp(`\\b${lowerColumn}\\b`).test(lower);
    if (hasTenantGuard) {
        return { text: normalizedQuery, values: params };
    }
    const clauseMatch = lower.match(/\s(group by|order by|limit|offset|returning|having|for update|for share)\b/);
    const insertionIndex = clauseMatch?.index ?? normalizedQuery.length;
    const before = normalizedQuery.slice(0, insertionIndex).trimEnd();
    const after = normalizedQuery.slice(insertionIndex);
    const values = [...params, tenantScope.tenantId];
    const paramIndex = values.length;
    const connector = whereIndex !== -1 && whereIndex < insertionIndex
        ? ` AND ${column} = $${paramIndex}`
        : ` WHERE ${column} = $${paramIndex}`;
    const text = `${before}${connector}${after}`;
    return { text, values };
};
exports.scopeSqlToTenant = scopeSqlToTenant;
const enforceCompartments = (targetCompartments, scope, options = {}) => {
    const compartments = [...targetCompartments];
    if (compartments.length === 0) {
        if (options.allowUnscoped)
            return;
        throw new IsolationViolationError('Compartment boundary requires explicit labels.', 'compartment');
    }
    const allowed = new Set(scope.compartments ?? []);
    const missing = compartments.filter((compartment) => !allowed.has(compartment));
    if (missing.length > 0) {
        throw new IsolationViolationError('Compartment boundary violation detected.', 'compartment', {
            missing,
            allowed: Array.from(allowed),
        });
    }
};
exports.enforceCompartments = enforceCompartments;
const assertServiceIsolation = (context, resource, options = {}) => {
    const tenantScope = (0, exports.requireTenantScope)(context.tenant);
    (0, exports.assertTenantMatch)(resource.tenantId, tenantScope, options.tenantColumn);
    if (options.requireCompartments) {
        (0, exports.enforceCompartments)(resource.compartments ?? [], tenantScope);
    }
    else if (resource.compartments && resource.compartments.length > 0) {
        (0, exports.enforceCompartments)(resource.compartments, tenantScope, { allowUnscoped: true });
    }
};
exports.assertServiceIsolation = assertServiceIsolation;
const createTenantScopedParams = (scope, baseParams = {}) => {
    const tenantScope = (0, exports.requireTenantScope)(scope);
    return {
        ...baseParams,
        tenantId: tenantScope.tenantId,
        compartments: tenantScope.compartments ?? [],
    };
};
exports.createTenantScopedParams = createTenantScopedParams;
