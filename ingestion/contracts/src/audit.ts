import { AuditEvent } from './types.js';

export class AppendOnlyAuditLog {
  private readonly events: AuditEvent[] = [];

  record(event: Omit<AuditEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): AuditEvent {
    const complete: AuditEvent = {
      id: event.id ?? `audit-${crypto.randomUUID()}`,
      actor: event.actor,
      action: event.action,
      timestamp: event.timestamp ?? new Date().toISOString(),
      details: event.details,
    };
    this.events.push(Object.freeze(complete));
    return complete;
  }

  list(): AuditEvent[] {
    return [...this.events];
  }
}
