export type AuditActorType = 'user' | 'service' | 'system' | 'api';

export interface AuditActorV1 {
  type: AuditActorType;
  id?: string;
  name?: string;
  ipAddress?: string;
}

export interface AuditActionV1 {
  type: string;
  name?: string;
  outcome?: 'success' | 'failure' | 'partial';
}

export interface AuditTargetV1 {
  type: string;
  id?: string;
  path?: string;
  name?: string;
}

export interface AuditEventV1 {
  eventId: string;
  occurredAt: string;
  actor: AuditActorV1;
  action: AuditActionV1;
  target?: AuditTargetV1;
  tenantId: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

export const AUDIT_EVENT_V1_SCHEMA_ID = 'audit.v1';
