"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceTenantScopeForCypher = enforceTenantScopeForCypher;
const ReceiptService_js_1 = require("./ReceiptService.js");
const logger_js_1 = require("../utils/logger.js");
const tenantFilterPattern = /(tenantId|tenant_id)\b/i;
function hasTenantFilter(query) {
    return tenantFilterPattern.test(query);
}
function injectTenantFilter(query) {
    if (hasTenantFilter(query)) {
        return query;
    }
    const match = query.match(/MATCH\s+\((\w+)/i);
    if (!match) {
        throw new Error('Tenant scope injection failed: no MATCH clause found');
    }
    const varName = match[1];
    if (/\bWHERE\b/i.test(query)) {
        return query.replace(/\bWHERE\b/i, `WHERE ${varName}.tenantId = $tenantId AND `);
    }
    return query.replace(/MATCH\s+\((\w+)/i, `MATCH ($1) WHERE $1.tenantId = $tenantId`);
}
async function emitTenantScopeDenial(params) {
    const tenantId = params.tenantId || 'unknown';
    const actorId = params.actorId || 'system';
    const action = params.action || 'graph.query';
    const resource = params.resource || 'graph.query';
    try {
        const receiptService = ReceiptService_js_1.ReceiptService.getInstance();
        await receiptService.generateReceipt({
            action: 'GRAPH_TENANT_SCOPE_DENIED',
            actor: { id: actorId, tenantId },
            resource,
            input: {
                reason: params.reason,
                action,
                resource,
                tenantId,
                ...(params.input ?? {}),
            },
            policyDecisionId: params.reason,
        });
    }
    catch (error) {
        logger_js_1.logger.error({ error, tenantId, action, resource }, 'Failed to emit tenant scope denial receipt');
    }
}
async function enforceTenantScopeForCypher(cypher, params = {}, options = {}) {
    const scopedTenantId = (options.tenantId ?? params.tenantId);
    if (!scopedTenantId || scopedTenantId.trim().length === 0) {
        await emitTenantScopeDenial({
            tenantId: options.tenantId,
            actorId: options.actorId,
            action: options.action,
            resource: options.resource,
            reason: 'tenant_scope_missing',
            input: { cypher },
        });
        throw new Error('Tenant scope required for graph query');
    }
    if (params.tenantId && params.tenantId !== scopedTenantId) {
        await emitTenantScopeDenial({
            tenantId: options.tenantId ?? scopedTenantId,
            actorId: options.actorId,
            action: options.action,
            resource: options.resource,
            reason: 'tenant_scope_mismatch',
            input: { cypher, paramsTenantId: params.tenantId },
        });
        throw new Error('Tenant scope mismatch for graph query');
    }
    let scopedCypher;
    try {
        scopedCypher = injectTenantFilter(cypher);
    }
    catch (error) {
        await emitTenantScopeDenial({
            tenantId: scopedTenantId,
            actorId: options.actorId,
            action: options.action,
            resource: options.resource,
            reason: 'tenant_scope_injection_failed',
            input: { cypher },
        });
        throw error;
    }
    return {
        cypher: scopedCypher,
        params: {
            ...params,
            tenantId: scopedTenantId,
        },
    };
}
