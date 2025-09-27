import { makeGraphServer } from '../../src/app/makeServer';
export function tenant(id) {
    return { tenant: id };
}
export function scopes(list) {
    return { scopes: list };
}
export function role(name) {
    return { role: name };
}
export async function makeUnitServer(opts = {}) {
    return makeGraphServer(opts);
}
// Sugar helpers for common patterns
export function unitAdmin(tenantId = 'test-tenant') {
    return { tenant: tenantId, role: 'ADMIN', scopes: ['*'] };
}
export function unitUserWithScopes(scopesList, tenantId = 'test-tenant') {
    return { tenant: tenantId, role: 'ANALYST', scopes: scopesList };
}
export function unitTenant(id) {
    return { tenant: id };
}
export function unitAnalyst(tenantId = 'test-tenant') {
    return { tenant: tenantId, role: 'ANALYST', scopes: ['graph:read'] };
}
//# sourceMappingURL=contextBuilders.js.map