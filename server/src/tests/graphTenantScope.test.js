"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const generateReceipt = globals_1.jest
    .fn()
    .mockImplementation(async () => ({ id: 'receipt-1' }));
globals_1.jest.mock('../services/ReceiptService.js', () => ({
    ReceiptService: {
        getInstance: () => ({
            generateReceipt,
        }),
    },
}));
const graphTenantScope_js_1 = require("../services/graphTenantScope.js");
(0, globals_1.describe)('graph tenant scope enforcement', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('injects tenant filter when missing', async () => {
        const result = await (0, graphTenantScope_js_1.enforceTenantScopeForCypher)('MATCH (n) RETURN n', { tenantId: 'tenant-1' }, { tenantId: 'tenant-1', actorId: 'user-1' });
        (0, globals_1.expect)(result.cypher).toContain('WHERE n.tenantId = $tenantId');
        (0, globals_1.expect)(result.params.tenantId).toBe('tenant-1');
        (0, globals_1.expect)(generateReceipt).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('preserves existing tenant filter', async () => {
        const result = await (0, graphTenantScope_js_1.enforceTenantScopeForCypher)('MATCH (n:Entity {tenantId: $tenantId}) RETURN n', { tenantId: 'tenant-2' }, { tenantId: 'tenant-2', actorId: 'user-2' });
        (0, globals_1.expect)(result.cypher).toBe('MATCH (n:Entity {tenantId: $tenantId}) RETURN n');
        (0, globals_1.expect)(result.params.tenantId).toBe('tenant-2');
    });
    (0, globals_1.it)('denies execution when tenant scope is missing', async () => {
        await (0, globals_1.expect)((0, graphTenantScope_js_1.enforceTenantScopeForCypher)('MATCH (n) RETURN n', {}, {})).rejects.toThrow(/Tenant scope required/);
        (0, globals_1.expect)(generateReceipt).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            action: 'GRAPH_TENANT_SCOPE_DENIED',
            actor: { id: 'system', tenantId: 'unknown' },
        }));
    });
    (0, globals_1.it)('denies execution when tenant scope mismatches', async () => {
        await (0, globals_1.expect)((0, graphTenantScope_js_1.enforceTenantScopeForCypher)('MATCH (n) RETURN n', { tenantId: 'tenant-a' }, { tenantId: 'tenant-b', actorId: 'user-3' })).rejects.toThrow(/Tenant scope mismatch/);
        (0, globals_1.expect)(generateReceipt).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            action: 'GRAPH_TENANT_SCOPE_DENIED',
            actor: { id: 'user-3', tenantId: 'tenant-b' },
        }));
    });
});
