import { UsageEvent } from './events';

export interface UsageMeteringService {
  record(event: UsageEvent): Promise<void>;
  recordBatch(events: UsageEvent[]): Promise<void>;
}

export class PostgresUsageMeteringService implements UsageMeteringService {
  async record(event: UsageEvent): Promise<void> {
    // TODO: Implement database insertion
    console.log('Recording usage event:', event);
    return Promise.resolve();
  }

  async recordBatch(events: UsageEvent[]): Promise<void> {
    // TODO: Implement batch database insertion
    console.log('Recording usage events:', events);
    return Promise.resolve();
  }
}
