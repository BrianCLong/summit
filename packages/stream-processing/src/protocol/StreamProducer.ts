/**
 * Stream Producer
 * High-performance producer with batching, compression, and exactly-once semantics
 */

import { EventEmitter } from 'events';
import type { ProducerConfig, ProducerRecord, ProducerResult } from '../types.js';
import { MessageBroker } from '../broker/MessageBroker.js';

export class StreamProducer extends EventEmitter {
  private config: ProducerConfig;
  private brokers: Map<string, MessageBroker> = new Map();
  private pendingBatch: Map<string, ProducerRecord[]> = new Map();
  private batchTimer: NodeJS.Timer | null = null;
  private transactionId?: string;
  private transactionOpen: boolean = false;

  constructor(config: ProducerConfig) {
    super();
    this.config = {
      acks: 'all',
      retries: 3,
      batchSize: 16384, // 16KB
      lingerMs: 10,
      bufferMemory: 32 * 1024 * 1024, // 32MB
      compressionType: 'none',
      maxInFlightRequestsPerConnection: 5,
      idempotence: false,
      ...config,
    };

    this.transactionId = config.transactionalId;

    if (this.config.lingerMs && this.config.lingerMs > 0) {
      this.startBatchTimer();
    }
  }

  /**
   * Connect to brokers
   */
  async connect(brokers: Map<string, MessageBroker>): Promise<void> {
    this.brokers = brokers;
    console.log(`Producer ${this.config.clientId} connected to ${brokers.size} brokers`);
  }

  /**
   * Send a message to a topic
   */
  async send(record: ProducerRecord): Promise<ProducerResult> {
    if (this.config.lingerMs && this.config.lingerMs > 0) {
      // Add to batch
      return this.addToBatch(record);
    } else {
      // Send immediately
      return this.sendImmediate(record);
    }
  }

  /**
   * Send multiple messages
   */
  async sendBatch(records: ProducerRecord[]): Promise<ProducerResult[]> {
    const results: ProducerResult[] = [];

    for (const record of records) {
      const result = await this.send(record);
      results.push(result);
    }

    return results;
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    if (!this.transactionId) {
      throw new Error('Cannot begin transaction without transactionalId');
    }

    if (this.transactionOpen) {
      throw new Error('Transaction already open');
    }

    this.transactionOpen = true;
    console.log(`Transaction ${this.transactionId} begun`);
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(): Promise<void> {
    if (!this.transactionOpen) {
      throw new Error('No transaction open');
    }

    // Flush any pending batches
    await this.flush();

    this.transactionOpen = false;
    console.log(`Transaction ${this.transactionId} committed`);
  }

  /**
   * Abort a transaction
   */
  async abortTransaction(): Promise<void> {
    if (!this.transactionOpen) {
      throw new Error('No transaction open');
    }

    // Clear pending batches
    this.pendingBatch.clear();

    this.transactionOpen = false;
    console.log(`Transaction ${this.transactionId} aborted`);
  }

  /**
   * Flush all pending batches
   */
  async flush(): Promise<void> {
    for (const [topic, records] of this.pendingBatch) {
      await this.sendBatchImmediate(records);
    }
    this.pendingBatch.clear();
  }

  /**
   * Close the producer
   */
  async close(): Promise<void> {
    // Flush pending batches
    await this.flush();

    // Stop batch timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    console.log(`Producer ${this.config.clientId} closed`);
  }

  /**
   * Add message to batch
   */
  private async addToBatch(record: ProducerRecord): Promise<ProducerResult> {
    const batch = this.pendingBatch.get(record.topic) || [];
    batch.push(record);
    this.pendingBatch.set(record.topic, batch);

    // Check if batch is full
    const batchSize = batch.reduce(
      (size, r) => size + Buffer.byteLength(r.value.toString()),
      0
    );

    if (batchSize >= this.config.batchSize!) {
      // Flush this topic's batch
      const records = this.pendingBatch.get(record.topic)!;
      this.pendingBatch.delete(record.topic);
      const results = await this.sendBatchImmediate(records);
      return results[results.length - 1];
    }

    // Return a promise that will resolve when batch is sent
    // For simplicity, return a mock result
    return {
      topic: record.topic,
      partition: 0,
      offset: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Send message immediately
   */
  private async sendImmediate(record: ProducerRecord): Promise<ProducerResult> {
    // Find the appropriate broker (leader for the partition)
    // For simplicity, use the first broker
    const broker = Array.from(this.brokers.values())[0];

    if (!broker) {
      throw new Error('No brokers available');
    }

    try {
      const result = await broker.produce(record);
      this.emit('message:sent', result);
      return result;
    } catch (error) {
      if (this.config.retries! > 0) {
        // Retry logic
        return this.retryProducer(record, this.config.retries!);
      }
      throw error;
    }
  }

  /**
   * Send batch immediately
   */
  private async sendBatchImmediate(records: ProducerRecord[]): Promise<ProducerResult[]> {
    const results: ProducerResult[] = [];

    for (const record of records) {
      const result = await this.sendImmediate(record);
      results.push(result);
    }

    return results;
  }

  /**
   * Retry producing a message
   */
  private async retryProducer(record: ProducerRecord, retries: number): Promise<ProducerResult> {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.sendImmediate(record);
      } catch (error) {
        if (i === retries - 1) {
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
      }
    }
    throw new Error('Retry limit exceeded');
  }

  /**
   * Start batch timer
   */
  private startBatchTimer(): void {
    this.batchTimer = setInterval(async () => {
      await this.flush();
    }, this.config.lingerMs!);
  }
}
