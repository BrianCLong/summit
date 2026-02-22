import { advancedAuditSystem } from './index.ts';
import type { AuditEventV1 } from './audit-v1.ts';

export interface EmitAuditOptions {
  level?: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  complianceRelevant?: boolean;
  complianceFrameworks?: string[];
  correlationId?: string;
  serviceId?: string;
}

export async function emitAuditEvent(
  event: AuditEventV1,
  options: EmitAuditOptions = {},
): Promise<string> {
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

  return advancedAuditSystem.recordEvent({
    eventType: event.action.type,
    level: options.level ?? 'info',
    correlationId:
      options.correlationId ?? event.traceId ?? event.eventId,
    tenantId: event.tenantId,
    serviceId: options.serviceId ?? 'server',
    action: event.action.type,
    outcome,
    message:
      typeof event.metadata?.message === 'string'
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
    requestId:
      typeof event.metadata?.requestId === 'string'
        ? event.metadata.requestId
        : undefined,
    sessionId:
      typeof event.metadata?.sessionId === 'string'
        ? event.metadata.sessionId
        : undefined,
    userAgent:
      typeof event.metadata?.userAgent === 'string'
        ? event.metadata.userAgent
        : undefined,
  });
}
