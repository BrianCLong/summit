"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toProvenanceEntry = toProvenanceEntry;
function toProvenanceEntry(event) {
    return {
        actorId: event.actor.id,
        actorType: event.actor.type, // Cast to match stricter ledger types if needed
        actionType: event.action,
        resourceType: event.resource.type,
        resourceId: event.resource.id,
        payload: {
            decision: event.decision,
            resourceName: event.resource.name,
            resourcePath: event.resource.path,
            // Ensure strict typing for MutationPayload if required by V2,
            // but here we use generic object which V2 supports via casting or flexible schema
            mutationType: 'UPDATE', // Default/Placeholder as V2 requires it in payload
            entityId: event.resource.id,
            entityType: event.resource.type
        },
        metadata: {
            ...event.metadata,
            traceId: event.traceId,
            actorName: event.actor.name,
            actorEmail: event.actor.email,
            ipAddress: event.actor.ip,
        },
        tenantId: event.tenantId || 'system',
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    };
}
