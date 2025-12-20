import { StreamProcessor } from './StreamProcessor.js';
import { StateStore, InMemoryStateStore } from './StateStore.js';

export class AggregationProcessor extends StreamProcessor {
  private stateStore: StateStore;

  constructor(
    consumer: any,
    producer: any,
    sourceTopic: string,
    destTopic: string,
    name: string,
    stateStore?: StateStore
  ) {
    super(consumer, producer, sourceTopic, destTopic, name);
    this.stateStore = stateStore || new InMemoryStateStore();
  }

  protected async process(message: any): Promise<any | null> {
    // Expecting CloudEvent structure
    const entityId = message.subject || message.data?.id;
    if (!entityId) return null;

    // Idempotency check (deduplication)
    // Assumes message.id is unique per event
    if (message.id) {
      const processedKey = `proc:${entityId}:${message.id}`;
      const isProcessed = await this.stateStore.get(processedKey);
      if (isProcessed) {
        this.logger.info(`Duplicate message ${message.id} for entity ${entityId} ignored`);
        return null;
      }
      // Mark as processed for 1 hour
      await this.stateStore.set(processedKey, '1', 3600);
    }

    // Use State Store for persistence
    const key = `agg:${entityId}`;
    const newCount = await this.stateStore.increment(key, 1);

    this.logger.info(`Entity ${entityId} count: ${newCount}`);

    // Emit an update every 5 events
    if (newCount % 5 === 0) {
      return {
        type: 'AGGREGATION_UPDATE',
        entityId,
        count: newCount,
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  }
}
