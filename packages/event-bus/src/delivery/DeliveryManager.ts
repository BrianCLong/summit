/**
 * DeliveryManager - Message delivery guarantees and tracking
 *
 * Implements at-least-once, at-most-once, and exactly-once delivery semantics
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import type {
  Message,
  MessageEnvelope,
  DeliveryGuarantee,
  MessageStatus
} from '../core/types.js';

export interface DeliveryRecord {
  messageId: string;
  status: MessageStatus;
  attempts: number;
  firstAttemptedAt: Date;
  lastAttemptedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

export class DeliveryManager extends EventEmitter {
  private redis: Redis;
  private deliveryRecords: Map<string, DeliveryRecord> = new Map();
  private inFlightMessages: Set<string> = new Set();

  constructor(redis: Redis) {
    super();
    this.redis = redis;
  }

  /**
   * Start tracking message delivery
   */
  async startDelivery(
    message: Message,
    guarantee: DeliveryGuarantee
  ): Promise<void> {
    const messageId = message.metadata.messageId;

    // For exactly-once, check if already delivered
    if (guarantee === DeliveryGuarantee.EXACTLY_ONCE) {
      const delivered = await this.isDelivered(messageId);
      if (delivered) {
        throw new Error(`Message ${messageId} already delivered`);
      }
    }

    const record: DeliveryRecord = {
      messageId,
      status: MessageStatus.PENDING,
      attempts: 1,
      firstAttemptedAt: new Date()
    };

    this.deliveryRecords.set(messageId, record);
    this.inFlightMessages.add(messageId);

    // Store in Redis for persistence
    await this.redis.hset(
      'delivery:records',
      messageId,
      JSON.stringify(record)
    );

    this.emit('delivery:started', { messageId });
  }

  /**
   * Mark message as processing
   */
  async markProcessing(messageId: string): Promise<void> {
    const record = this.deliveryRecords.get(messageId);
    if (!record) {
      throw new Error(`No delivery record for message ${messageId}`);
    }

    record.status = MessageStatus.PROCESSING;
    record.lastAttemptedAt = new Date();

    await this.redis.hset(
      'delivery:records',
      messageId,
      JSON.stringify(record)
    );

    this.emit('delivery:processing', { messageId });
  }

  /**
   * Complete message delivery
   */
  async complete(messageId: string): Promise<void> {
    const record = this.deliveryRecords.get(messageId);
    if (!record) {
      throw new Error(`No delivery record for message ${messageId}`);
    }

    record.status = MessageStatus.COMPLETED;
    record.completedAt = new Date();

    await this.redis.hset(
      'delivery:records',
      messageId,
      JSON.stringify(record)
    );

    // Mark as delivered for exactly-once semantics
    await this.redis.sadd('delivery:completed', messageId);
    await this.redis.expire('delivery:completed', 86400); // 24 hours

    this.inFlightMessages.delete(messageId);
    this.emit('delivery:completed', { messageId });
  }

  /**
   * Fail message delivery
   */
  async fail(messageId: string, error: string): Promise<void> {
    const record = this.deliveryRecords.get(messageId);
    if (!record) {
      throw new Error(`No delivery record for message ${messageId}`);
    }

    record.status = MessageStatus.FAILED;
    record.failedAt = new Date();
    record.error = error;

    await this.redis.hset(
      'delivery:records',
      messageId,
      JSON.stringify(record)
    );

    this.inFlightMessages.delete(messageId);
    this.emit('delivery:failed', { messageId, error });
  }

  /**
   * Retry message delivery
   */
  async retry(messageId: string): Promise<void> {
    const record = this.deliveryRecords.get(messageId);
    if (!record) {
      throw new Error(`No delivery record for message ${messageId}`);
    }

    record.attempts++;
    record.lastAttemptedAt = new Date();
    record.status = MessageStatus.PENDING;

    await this.redis.hset(
      'delivery:records',
      messageId,
      JSON.stringify(record)
    );

    this.emit('delivery:retry', { messageId, attempt: record.attempts });
  }

  /**
   * Check if message has been delivered (for exactly-once)
   */
  async isDelivered(messageId: string): Promise<boolean> {
    return (await this.redis.sismember('delivery:completed', messageId)) === 1;
  }

  /**
   * Get delivery record
   */
  getRecord(messageId: string): DeliveryRecord | undefined {
    return this.deliveryRecords.get(messageId);
  }

  /**
   * Get all in-flight messages
   */
  getInFlightMessages(): string[] {
    return Array.from(this.inFlightMessages);
  }

  /**
   * Get delivery statistics
   */
  getStats(): {
    totalMessages: number;
    inFlight: number;
    completed: number;
    failed: number;
  } {
    const records = Array.from(this.deliveryRecords.values());

    return {
      totalMessages: records.length,
      inFlight: this.inFlightMessages.size,
      completed: records.filter(r => r.status === MessageStatus.COMPLETED)
        .length,
      failed: records.filter(r => r.status === MessageStatus.FAILED).length
    };
  }
}
