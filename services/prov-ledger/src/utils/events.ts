import { randomUUID } from 'crypto';

export interface CloudEvent<T = any> {
  id: string;
  type: string;
  source: string;
  time: string;
  data: T;
  specversion: '1.0';
}

class EventBus {
  private events: CloudEvent[] = [];

  emit<T>(type: string, data: T): CloudEvent<T> {
    const event: CloudEvent<T> = {
      id: randomUUID(),
      type,
      source: 'services/prov-ledger',
      time: new Date().toISOString(),
      data,
      specversion: '1.0',
    };
    this.events.push(event);
    return event;
  }

  drain(): CloudEvent[] {
    const snapshot = [...this.events];
    this.events = [];
    return snapshot;
  }
}

export const eventBus = new EventBus();
