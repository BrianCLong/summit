"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitAuditEvent = emitAuditEvent;
const index_js_1 = require("./index.js");
async function emitAuditEvent(event, options = {}) {
    const outcome = event.action.outcome ?? 'success';
    const details = {
        auditVersion: 'audit.v1',
        eventId: event.eventId,
        occurredAt: event.occurredAt,
        actor: event.actor,
        target: event.target,
        traceId: event.traceId,
        metadata: event.metadata ?? {},
    };
    return index_js_1.advancedAuditSystem.recordEvent({
        eventType: event.action.type,
        level: options.level ?? 'info',
        correlationId: options.correlationId ?? event.traceId ?? event.eventId,
        tenantId: event.tenantId,
        serviceId: options.serviceId ?? 'server',
        action: event.action.type,
        outcome,
        message: typeof event.metadata?.message === 'string'
            ? event.metadata.message
            : `audit.${event.action.type}`,
        details,
        complianceRelevant: options.complianceRelevant ?? false,
        complianceFrameworks: options.complianceFrameworks ?? [],
        userId: event.actor.id,
        resourceType: event.target?.type,
        resourceId: event.target?.id,
        resourcePath: event.target?.path,
        ipAddress: event.actor.ipAddress,
        requestId: typeof event.metadata?.requestId === 'string'
            ? event.metadata.requestId
            : undefined,
        sessionId: typeof event.metadata?.sessionId === 'string'
            ? event.metadata.sessionId
            : undefined,
        userAgent: typeof event.metadata?.userAgent === 'string'
            ? event.metadata.userAgent
            : undefined,
    });
}
