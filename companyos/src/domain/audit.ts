import { createHash } from 'crypto';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  actorId: string;
  tenantId: string;
  action: string;
  resource: string;
  decision: 'allow' | 'deny';
  policyVersion: string;
  reason?: string;
  hash: string;
}

export function calculateAuditHash(event: Omit<AuditEvent, 'hash'>): string {
  const data = `${event.id}|${event.timestamp.toISOString()}|${event.actorId}|${event.tenantId}|${event.action}|${event.resource}|${event.decision}|${event.policyVersion}`;
  return createHash('sha256').update(data).digest('hex');
}
