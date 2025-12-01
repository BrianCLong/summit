import { randomUUID } from 'crypto';
import { AuditEvent } from './types';

export class AuditLog {
  private events: AuditEvent[] = [];

  public record(
    type: AuditEvent['type'],
    metadata: Record<string, unknown>,
    parentId?: string
  ): AuditEvent {
    const event: AuditEvent = {
      id: randomUUID(),
      type,
      parentId,
      timestamp: Date.now(),
      metadata
    };
    this.events.push(event);
    return event;
  }

  public getEvents(): AuditEvent[] {
    return [...this.events];
  }

  public findChildren(parentId: string): AuditEvent[] {
    return this.events.filter((event) => event.parentId === parentId);
  }
}
