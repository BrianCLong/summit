
import { GraphEvent, EventType } from './types';
import crypto from 'crypto';

export class EventLog {
  private events: GraphEvent[] = [];
  private lastHash: string = '';

  // In a real system, this would write to a DB (Postgres/Mongo)
  // For this task, we use in-memory storage, but with a structure ready for persistence.

  async append(
    type: EventType,
    tenantId: string,
    actorId: string,
    entityId: string,
    entityType: string,
    before: any,
    after: any
  ): Promise<GraphEvent> {
    const timestamp = new Date();
    const eventId = crypto.randomUUID();

    // Create hash payload
    const payload = JSON.stringify({
       previousHash: this.lastHash,
       eventId,
       type,
       tenantId,
       actorId,
       timestamp: timestamp.toISOString(),
       entityId,
       entityType,
       before,
       after
    });

    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    const event: GraphEvent = {
      id: eventId,
      type,
      tenantId,
      actorId,
      timestamp,
      entityId,
      entityType,
      before,
      after,
      previousHash: this.lastHash,
      hash
    };

    this.events.push(event);
    this.lastHash = hash;

    return event;
  }

  async getEvents(tenantId: string): Promise<GraphEvent[]> {
    return this.events.filter(e => e.tenantId === tenantId);
  }

  // Debug method
  clear() {
    this.events = [];
    this.lastHash = '';
  }
}

export const eventLog = new EventLog();
