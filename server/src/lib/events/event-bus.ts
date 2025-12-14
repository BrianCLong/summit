import { EventEmitter } from 'events';
import { logger } from '../config/logger.js';
import { correlationStorage } from '../config/logger.js';
import { summitMetrics } from './summit-metrics.js';

export interface SummitEvent<T = any> {
  name: string;
  data: T;
  timestamp: string;
  correlationId?: string;
  tenantId?: string;
  principalId?: string;
}

class SummitEventBus extends EventEmitter {
  public publish<T>(name: string, data: T) {
    const store = correlationStorage.getStore();
    const event: SummitEvent<T> = {
      name,
      data,
      timestamp: new Date().toISOString(),
      correlationId: store?.get('correlationId'),
      tenantId: store?.get('tenantId'),
      principalId: store?.get('principalId'),
    };

    logger.info({ event }, `Event published: ${name}`);
    summitMetrics.getCounter('summit_events_published_total', 'Total events published')
        .add(1, { kind: name, tenantId: event.tenantId });

    this.emit(name, event);
    this.emit('*', event);
  }

  public subscribe<T>(name: string, handler: (event: SummitEvent<T>) => void) {
    this.on(name, handler);
  }
}

export const eventBus = new SummitEventBus();
