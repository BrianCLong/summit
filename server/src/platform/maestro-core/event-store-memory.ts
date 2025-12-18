import { MaestroEvent, MaestroEventStore } from './types.js';

export class InMemoryEventStore implements MaestroEventStore {
  private events: MaestroEvent[] = [];

  async append(eventData: Omit<MaestroEvent, 'id' | 'timestamp'>): Promise<MaestroEvent> {
    const event: MaestroEvent = {
      ...eventData,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    this.events.push(event);
    return event;
  }

  async query(tenantId: string, filters?: Partial<MaestroEvent>): Promise<MaestroEvent[]> {
    return this.events.filter(e => {
      if (e.tenantId !== tenantId) return false;
      if (filters) {
        for (const key in filters) {
          // @ts-ignore
          if (e[key] !== filters[key]) return false;
        }
      }
      return true;
    });
  }
}
