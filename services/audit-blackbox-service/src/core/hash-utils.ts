import { createHash } from 'crypto';
import type { AuditEvent } from './types.js';

export const GENESIS_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';

export function calculateEventHash(event: AuditEvent): string {
  const hashableData = {
    id: event.id,
    eventType: event.eventType,
    level: event.level,
    timestamp:
      event.timestamp instanceof Date
        ? event.timestamp.toISOString()
        : event.timestamp,
    correlationId: event.correlationId,
    tenantId: event.tenantId,
    serviceId: event.serviceId,
    serviceName: event.serviceName,
    environment: event.environment,
    userId: event.userId,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    action: event.action,
    outcome: event.outcome,
    message: event.message,
    details: event.details,
    complianceRelevant: event.complianceRelevant,
    complianceFrameworks: event.complianceFrameworks,
  };

  const sortedJson = JSON.stringify(hashableData, Object.keys(hashableData).sort());
  return createHash('sha256').update(sortedJson).digest('hex');
}

export function calculateChainHash(
  eventHash: string,
  previousHash: string,
  sequence: bigint,
): string {
  const data = `${eventHash}:${previousHash}:${sequence.toString()}`;
  return createHash('sha256').update(data).digest('hex');
}
