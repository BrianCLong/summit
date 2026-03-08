"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceTenantInCypher = enforceTenantInCypher;
function enforceTenantInCypher(query, tenant) {
    if (!/WHERE\s+tenant_id\s*=/.test(query))
        throw new Error('tenant_filter_required');
}
