"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitTenantProvisioningReceipts = emitTenantProvisioningReceipts;
const ledger_js_1 = require("./ledger.js");
function summarizeReceipt(entry) {
    return {
        id: entry.id,
        actionType: entry.actionType,
        timestamp: entry.timestamp.toISOString(),
    };
}
async function emitTenantProvisioningReceipts(input) {
    const provisioningEntry = await ledger_js_1.provenanceLedger.appendEntry({
        tenantId: input.tenantId,
        timestamp: new Date(),
        actionType: 'TENANT_PROVISIONED',
        resourceType: 'tenant',
        resourceId: input.tenantId,
        actorId: input.actorId,
        actorType: input.actorType,
        payload: {
            mutationType: 'CREATE',
            entityId: input.tenantId,
            entityType: 'Tenant',
            namespace: input.namespace,
            partitions: input.partitions,
            plan: input.plan,
            environment: input.environment,
            requestedSeats: input.requestedSeats,
            storageEstimateBytes: input.storageEstimateBytes,
        },
        metadata: {
            correlationId: input.correlationId,
            requestId: input.requestId,
        },
    });
    const quotaEntry = await ledger_js_1.provenanceLedger.appendEntry({
        tenantId: input.tenantId,
        timestamp: new Date(),
        actionType: 'TENANT_QUOTA_ASSIGNED',
        resourceType: 'quota',
        resourceId: input.tenantId,
        actorId: input.actorId,
        actorType: input.actorType,
        payload: {
            mutationType: 'CREATE',
            entityId: input.tenantId,
            entityType: 'Quota',
            quota: input.quota,
            plan: input.plan,
            environment: input.environment,
        },
        metadata: {
            correlationId: input.correlationId,
            requestId: input.requestId,
        },
    });
    return {
        provisioning: summarizeReceipt(provisioningEntry),
        quotaAssignment: summarizeReceipt(quotaEntry),
    };
}
