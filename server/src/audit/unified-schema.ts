
import type { ProvenanceEntry } from '../provenance/ledger.ts';

export interface UnifiedAuditEvent {
  actor: {
    id: string;
    type: 'user' | 'system' | 'api' | 'ci' | 'deploy';
    name?: string;
    email?: string;
    ip?: string;
  };
  action: string;
  resource: {
    type: string;
    id: string;
    name?: string;
    path?: string;
  };
  decision?: {
    outcome: 'allow' | 'deny' | 'error' | 'success' | 'failure';
    policyId?: string;
    reason?: string;
  };
  traceId?: string;
  hash?: string; // Optional on input, calculated on storage
  timestamp?: string; // ISO 8601
  metadata?: Record<string, any>;
  tenantId?: string;
}

export function toProvenanceEntry(event: UnifiedAuditEvent): Omit<ProvenanceEntry, 'id' | 'sequenceNumber' | 'previousHash' | 'currentHash' | 'witness'> {
  return {
    actorId: event.actor.id,
    actorType: event.actor.type as any, // Cast to match stricter ledger types if needed
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
