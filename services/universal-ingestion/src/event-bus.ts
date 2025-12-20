/**
 * Ingest Event Bus
 *
 * Abstract interface for emitting ingestion events.
 * Default implementation uses in-memory queue, can be replaced with Kafka adapter.
 */

export interface IngestEvent {
  sourceId: string;
  connectorType: string;
  rawPayload: unknown;
  ingestedAt: string;
  licenseId: string;
  sensitivity?: string;
  schemaHint?: string;
}

/**
 * Event Bus Interface
 */
export interface IngestEventBus {
  /**
   * Emit an ingestion event
   */
  emit(event: IngestEvent): Promise<void>;

  /**
   * Emit multiple events in batch
   */
  emitBatch(events: IngestEvent[]): Promise<void>;

  /**
   * Flush any buffered events
   */
  flush(): Promise<void>;

  /**
   * Close the event bus
   */
  close(): Promise<void>;
}

/**
 * In-Memory Event Bus (for development/testing)
 */
export class InMemoryEventBus implements IngestEventBus {
  private events: IngestEvent[] = [];
  private readonly maxEvents: number;

  constructor(maxEvents = 10000) {
    this.maxEvents = maxEvents;
  }

  async emit(event: IngestEvent): Promise<void> {
    this.events.push(event);

    // Simple overflow protection
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  async emitBatch(events: IngestEvent[]): Promise<void> {
    for (const event of events) {
      await this.emit(event);
    }
  }

  async flush(): Promise<void> {
    // No-op for in-memory implementation
  }

  async close(): Promise<void> {
    // No-op for in-memory implementation
  }

  /**
   * Get all emitted events (for testing)
   */
  getEvents(): IngestEvent[] {
    return [...this.events];
  }

  /**
   * Clear all events (for testing)
   */
  clear(): void {
    this.events = [];
  }
}

/**
 * Kafka Event Bus (future implementation)
 *
 * This would use a real Kafka client to emit events.
 */
export class KafkaEventBus implements IngestEventBus {
  constructor(
    private readonly kafkaConfig: {
      brokers: string[];
      topic: string;
      clientId?: string;
    }
  ) {
    // In a real implementation, initialize Kafka producer here
    throw new Error('KafkaEventBus not yet implemented. Use InMemoryEventBus for now.');
  }

  async emit(event: IngestEvent): Promise<void> {
    // Serialize and send to Kafka
    throw new Error('Not implemented');
  }

  async emitBatch(events: IngestEvent[]): Promise<void> {
    // Batch send to Kafka
    throw new Error('Not implemented');
  }

  async flush(): Promise<void> {
    // Flush Kafka producer
    throw new Error('Not implemented');
  }

  async close(): Promise<void> {
    // Close Kafka producer
    throw new Error('Not implemented');
  }
}
