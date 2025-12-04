import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { createHash, randomUUID } from 'crypto';
import { EventStore } from './eventStore.js';
import { EventSchema, type Event } from './types.js';
import type { Logger } from 'pino';

export class EventConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private eventStore: EventStore;
  private logger: Logger;
  private isRunning = false;

  constructor(
    brokers: string[],
    groupId: string,
    eventStore: EventStore,
    logger: Logger
  ) {
    this.kafka = new Kafka({
      clientId: 'streaming-ingest',
      brokers,
    });
    this.consumer = this.kafka.consumer({ groupId });
    this.eventStore = eventStore;
    this.logger = logger.child({ component: 'EventConsumer' });
  }

  /**
   * Start consuming events from Kafka
   */
  async start(topics: string[]): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topics, fromBeginning: false });

    this.isRunning = true;

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.processMessage(payload);
      },
    });

    this.logger.info({ topics }, 'Event consumer started');
  }

  /**
   * Process individual message with schema validation and provenance
   */
  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      // Parse and validate event
      const rawEvent = JSON.parse(message.value?.toString() || '{}');

      // Add provenance metadata
      const eventWithProvenance = this.enrichWithProvenance(rawEvent, topic);

      // Validate against schema
      const validatedEvent = EventSchema.parse(eventWithProvenance);

      // Append to event store
      await this.eventStore.append(
        validatedEvent,
        partition,
        message.offset
      );

      this.logger.debug(
        {
          eventId: validatedEvent.id,
          type: validatedEvent.type,
          partition,
          offset: message.offset,
        },
        'Event processed and stored'
      );
    } catch (error) {
      this.logger.error(
        {
          error,
          topic,
          partition,
          offset: message.offset,
        },
        'Failed to process event'
      );
      // In production, you might want to send to a dead-letter queue
      throw error;
    }
  }

  /**
   * Enrich event with provenance metadata
   */
  private enrichWithProvenance(rawEvent: any, topic: string): Event {
    const now = Date.now();

    // Ensure event has required structure
    const event = {
      id: rawEvent.id || randomUUID(),
      type: rawEvent.type,
      source: rawEvent.source || topic,
      timestamp: rawEvent.timestamp || now,
      data: rawEvent.data || {},
      metadata: rawEvent.metadata || {},
      provenance: rawEvent.provenance || {},
    };

    // Calculate content hash
    const contentHash = createHash('sha256')
      .update(JSON.stringify({ type: event.type, data: event.data }))
      .digest('hex');

    // Enrich provenance
    event.provenance = {
      hash: contentHash,
      signature: event.provenance.signature,
      policyTags: event.provenance.policyTags || [],
      classification: event.provenance.classification || 'UNCLASSIFIED',
      source: event.source,
      ingestionTime: now,
      transformations: event.provenance.transformations || [],
    };

    return event;
  }

  /**
   * Stop consuming
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    await this.consumer.disconnect();
    this.logger.info('Event consumer stopped');
  }

  /**
   * Batch processing for high throughput
   */
  async startBatch(topics: string[], batchSize = 100): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topics, fromBeginning: false });

    this.isRunning = true;

    await this.consumer.run({
      eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
        const events: Array<{ event: Event; partition: number; offset: string }> = [];

        for (const message of batch.messages) {
          try {
            const rawEvent = JSON.parse(message.value?.toString() || '{}');
            const eventWithProvenance = this.enrichWithProvenance(rawEvent, batch.topic);
            const validatedEvent = EventSchema.parse(eventWithProvenance);

            events.push({
              event: validatedEvent,
              partition: batch.partition,
              offset: message.offset,
            });

            // Commit offset after processing
            resolveOffset(message.offset);
          } catch (error) {
            this.logger.error({ error, offset: message.offset }, 'Failed to process event in batch');
          }
        }

        // Batch append to event store
        if (events.length > 0) {
          await this.eventStore.batchAppend(events);
        }

        // Send heartbeat to keep consumer alive
        await heartbeat();

        this.logger.debug(
          { topic: batch.topic, partition: batch.partition, count: events.length },
          'Batch processed'
        );
      },
    });

    this.logger.info({ topics, batchSize }, 'Event consumer started in batch mode');
  }
}
