// Event Contract Definitions
export const EVENT_VERSION = '1.0.0';

export enum EventType {
    INCIDENT_CREATED = 'incident.created',
    INCIDENT_UPDATED = 'incident.updated',
    AUDIT_LOG_CREATED = 'audit.log.created',
    INTEGRATION_TEST = 'integration.test',
}

export const REQUIRED_FIELDS = ['event_id', 'tenant_id', 'occurred_at', 'type', 'schema_version'];
