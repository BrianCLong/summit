"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQueryGuard = void 0;
exports.enforceTenantInCypher = enforceTenantInCypher;
exports.sanitizeCypherQuery = sanitizeCypherQuery;
function enforceTenantInCypher(query, tenant) {
    const tenantFilterRegex = /WHERE\s+tenant_id\s*=/i;
    if (!tenantFilterRegex.test(query)) {
        throw new Error('tenant_filter_required: All Cypher queries must include tenant_id filter');
    }
    // Additional validation: ensure the tenant ID in the query matches the request tenant
    const tenantIdPattern = new RegExp(`tenant_id\\s*=\\s*["']${tenant}["']`, 'i');
    if (!tenantIdPattern.test(query)) {
        throw new Error('tenant_mismatch: Query tenant_id does not match request tenant');
    }
}
function sanitizeCypherQuery(query) {
    // Remove potential injection patterns
    const dangerousPatterns = [
        /;\s*(DROP|DELETE|CREATE|ALTER|MERGE|SET)\s+/gi,
        /CALL\s+db\./gi,
        /CALL\s+apoc\./gi,
    ];
    for (const pattern of dangerousPatterns) {
        if (pattern.test(query)) {
            throw new Error('potentially_dangerous_query: Query contains suspicious patterns');
        }
    }
    return query.trim();
}
class GraphQueryGuard {
    tenant;
    constructor(tenant) {
        this.tenant = tenant;
    }
    validateAndSanitize(query) {
        const sanitized = sanitizeCypherQuery(query);
        enforceTenantInCypher(sanitized, this.tenant);
        return sanitized;
    }
    addTenantFilter(baseQuery) {
        // If query already has WHERE clause, add tenant filter with AND
        if (/WHERE\s+/i.test(baseQuery)) {
            return baseQuery.replace(/WHERE\s+/i, `WHERE tenant_id = '${this.tenant}' AND `);
        }
        // If query has RETURN but no WHERE, add WHERE before RETURN
        if (/RETURN\s+/i.test(baseQuery)) {
            return baseQuery.replace(/RETURN\s+/i, `WHERE tenant_id = '${this.tenant}' RETURN `);
        }
        // Otherwise append WHERE clause
        return `${baseQuery} WHERE tenant_id = '${this.tenant}'`;
    }
}
exports.GraphQueryGuard = GraphQueryGuard;
