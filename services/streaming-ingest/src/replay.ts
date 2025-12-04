import { Kafka, Producer } from 'kafkajs';
import { randomUUID } from 'crypto';
import { EventStore } from './eventStore.js';
import type { ReplayRequest, Checkpoint } from './types.js';
import type { Logger } from 'pino';

export class ReplayService {
  private kafka: Kafka;
  private producer: Producer;
  private eventStore: EventStore;
  private logger: Logger;

  constructor(brokers: string[], eventStore: EventStore, logger: Logger) {
    this.kafka = new Kafka({
      clientId: 'streaming-ingest-replay',
      brokers,
    });
    this.producer = this.kafka.producer();
    this.eventStore = eventStore;
    this.logger = logger.child({ component: 'ReplayService' });
  }

  /**
   * Initialize replay service
   */
  async initialize(): Promise<void> {
    await this.producer.connect();
    this.logger.info('Replay service initialized');
  }

  /**
   * Replay events from checkpoint or offset range
   */
  async replay(request: ReplayRequest): Promise<{
    eventsReplayed: number;
    checkpointCreated?: string;
  }> {
    this.logger.info({ request }, 'Starting event replay');

    let fromOffset: string;

    // Determine starting offset
    if (request.checkpointId) {
      const checkpoint = await this.eventStore.getCheckpoint(request.checkpointId);
      if (!checkpoint) {
        throw new Error(`Checkpoint ${request.checkpointId} not found`);
      }
      fromOffset = checkpoint.offset;
      this.logger.info({ checkpointId: request.checkpointId, offset: fromOffset }, 'Replaying from checkpoint');
    } else if (request.fromOffset) {
      fromOffset = request.fromOffset;
    } else {
      throw new Error('Either checkpointId or fromOffset must be provided');
    }

    // Fetch events from event store
    const events = await this.eventStore.getEventsForReplay(
      fromOffset,
      request.toOffset,
      request.filters
    );

    this.logger.info({ count: events.length }, 'Events fetched for replay');

    // Target topic (default to original topic if not specified)
    const targetTopic = request.targetTopic || request.topic;

    // Replay events
    let replayedCount = 0;
    for (const record of events) {
      try {
        await this.producer.send({
          topic: targetTopic,
          messages: [
            {
              key: record.id,
              value: JSON.stringify({
                id: record.id,
                type: record.event_type,
                source: record.source,
                timestamp: Number(record.timestamp),
                data: record.data,
                metadata: record.metadata,
                provenance: {
                  ...record.provenance,
                  replayed: true,
                  replayedAt: Date.now(),
                },
              }),
            },
          ],
        });

        replayedCount++;

        if (replayedCount % 1000 === 0) {
          this.logger.info({ replayed: replayedCount, total: events.length }, 'Replay progress');
        }
      } catch (error) {
        this.logger.error({ error, eventId: record.id }, 'Failed to replay event');
        throw error;
      }
    }

    // Create checkpoint for this replay
    const checkpointId = randomUUID();
    const checkpoint: Checkpoint = {
      id: checkpointId,
      topic: request.topic,
      partition: 0, // Aggregate across partitions
      offset: events[events.length - 1]?.offset || fromOffset,
      timestamp: Date.now(),
      eventCount: replayedCount,
      hash: this.eventStore.calculateHash(
        events.map(e => ({
          id: e.id,
          type: e.event_type,
          source: e.source,
          timestamp: Number(e.timestamp),
          data: e.data as any,
          metadata: e.metadata as any,
          provenance: e.provenance as any,
        }))
      ),
    };

    await this.eventStore.saveCheckpoint(checkpoint);

    this.logger.info(
      { eventsReplayed: replayedCount, checkpointId },
      'Replay completed successfully'
    );

    return {
      eventsReplayed: replayedCount,
      checkpointCreated: checkpointId,
    };
  }

  /**
   * Create checkpoint at current position
   */
  async createCheckpoint(topic: string, partition: number, offset: string): Promise<string> {
    const checkpointId = randomUUID();

    // Get recent events to calculate hash
    const events = await this.eventStore.getEventsForReplay(offset, offset);

    const checkpoint: Checkpoint = {
      id: checkpointId,
      topic,
      partition,
      offset,
      timestamp: Date.now(),
      eventCount: events.length,
      hash: this.eventStore.calculateHash(
        events.map(e => ({
          id: e.id,
          type: e.event_type,
          source: e.source,
          timestamp: Number(e.timestamp),
          data: e.data as any,
          metadata: e.metadata as any,
          provenance: e.provenance as any,
        }))
      ),
    };

    await this.eventStore.saveCheckpoint(checkpoint);

    this.logger.info({ checkpointId, topic, partition, offset }, 'Checkpoint created');

    return checkpointId;
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.producer.disconnect();
    this.logger.info('Replay service closed');
  }
}
