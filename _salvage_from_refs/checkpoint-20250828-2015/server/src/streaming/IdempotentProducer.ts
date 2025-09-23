import { Kafka, Producer, ProducerRecord, RecordMetadata } from 'kafkajs';
import { createHash } from 'crypto';
import { Redis } from 'ioredis';
import { StreamingSLOManager } from './StreamingSLO';

interface IdempotentMessage {
  key: string;
  value: string | Buffer;
  headers?: Record<string, string | Buffer>;
  partition?: number;
  timestamp?: string;
  
  // Idempotency metadata
  messageId: string;
  tenantId: string;
  producerId: string;
  sequenceNumber: number;
  createdAt: Date;
  expiresAt?: Date;
  
  // Provenance for audit trail
  provenance: {
    sourceSystem: string;
    userId?: string;
    investigationId?: string;
    reasonForAccess?: string;
    chainOfCustody: Array<{
      timestamp: Date;
      action: string;
      actor: string;
      metadata?: Record<string, any>;
    }>;
  };
}

/**
 * Idempotent Kafka Producer with exactly-once semantics
 * Provides message deduplication, provenance tracking, and DLQ handling
 */
export class IdempotentKafkaProducer {
  private producer: Producer;
  private redis: Redis;
  private sloManager: StreamingSLOManager;
  private producerId: string;
  private sequenceCounter = 0;
  
  // Topics that require exactly-once semantics
  private readonly CRITICAL_TOPICS = new Set([
    'intelgraph.alerts',
    'intelgraph.audit',
    'intelgraph.exports', 
    'intelgraph.provenance',
    'intelgraph.investigations'
  ]);

  constructor(kafka: Kafka, redis: Redis, sloManager: StreamingSLOManager, producerId?: string) {
    this.producer = kafka.producer({
      transactionTimeout: 30000,
      idempotent: true, // Enable Kafka idempotent producer
      maxInFlightRequests: 1, // Ensure ordering
      retries: 5,
      retry: {
        initialRetryTime: 300,
        maxRetryTime: 30000,
        multiplier: 2,
        retries: 5
      }
    });
    
    this.redis = redis;
    this.sloManager = sloManager;
    this.producerId = producerId || `producer-${Date.now()}-${Math.random().toString(36)}`;
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  /**
   * Send message with idempotency guarantees
   */
  async sendIdempotent(
    topic: string,
    message: Partial<IdempotentMessage>
  ): Promise<RecordMetadata[]> {
    // Generate unique message ID if not provided
    const messageId = message.messageId || this.generateMessageId(topic, message);
    const sequenceNumber = ++this.sequenceCounter;
    
    // Build complete idempotent message
    const idempotentMessage: IdempotentMessage = {
      ...message,
      messageId,
      tenantId: message.tenantId || 'default',
      producerId: this.producerId,
      sequenceNumber,
      createdAt: new Date(),
      expiresAt: message.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h default
      key: message.key || messageId,
      value: typeof message.value === 'string' ? message.value : JSON.stringify(message.value),
      provenance: message.provenance || this.createDefaultProvenance()
    };

    // Check if message already sent (deduplication)
    if (await this.isMessageSent(messageId)) {
      console.log(`Message ${messageId} already sent, skipping`);
      return [];
    }

    try {
      // For critical topics, use transactions
      if (this.CRITICAL_TOPICS.has(topic)) {
        return await this.sendWithTransaction(topic, idempotentMessage);
      } else {
        return await this.sendRegular(topic, idempotentMessage);
      }
    } catch (error) {
      console.error(`Failed to send message ${messageId} to ${topic}:`, error);
      
      // Send to DLQ if retries exhausted
      await this.sendToDLQ(topic, idempotentMessage, error);
      throw error;
    }
  }

  /**
   * Send message with transaction for exactly-once semantics
   */
  private async sendWithTransaction(
    topic: string,
    message: IdempotentMessage
  ): Promise<RecordMetadata[]> {
    const transaction = await this.producer.transaction();
    
    try {
      // Mark message as being sent
      await this.markMessageSending(message.messageId);
      
      // Send message within transaction
      const result = await transaction.send({
        topic,
        messages: [{
          key: message.key,
          value: message.value,
          headers: {
            ...message.headers,
            'message-id': message.messageId,
            'tenant-id': message.tenantId,
            'producer-id': message.producerId,
            'sequence-number': message.sequenceNumber.toString(),
            'created-at': message.createdAt.toISOString(),
            'provenance': JSON.stringify(message.provenance)
          },
          partition: message.partition,
          timestamp: message.timestamp
        }]
      });
      
      // Commit transaction
      await transaction.commit();
      
      // Mark message as successfully sent
      await this.markMessageSent(message.messageId, message.expiresAt);
      
      // Track latency for SLO
      this.sloManager.trackAlertLatency(
        message.messageId,
        topic,
        message.tenantId,
        message.createdAt
      );
      
      console.log(`Message ${message.messageId} sent to ${topic} with transaction`);
      return result;
      
    } catch (error) {
      await transaction.abort();
      await this.clearMessageSending(message.messageId);
      throw error;
    }
  }

  /**
   * Send message without transaction (for non-critical topics)
   */
  private async sendRegular(
    topic: string, 
    message: IdempotentMessage
  ): Promise<RecordMetadata[]> {
    // Mark message as being sent
    await this.markMessageSending(message.messageId);
    
    try {
      const result = await this.producer.send({
        topic,
        messages: [{
          key: message.key,
          value: message.value,
          headers: {
            ...message.headers,
            'message-id': message.messageId,
            'tenant-id': message.tenantId,
            'producer-id': message.producerId,
            'sequence-number': message.sequenceNumber.toString(),
            'created-at': message.createdAt.toISOString(),
            'provenance': JSON.stringify(message.provenance)
          },
          partition: message.partition,
          timestamp: message.timestamp
        }]
      });
      
      // Mark message as successfully sent
      await this.markMessageSent(message.messageId, message.expiresAt);
      
      // Track latency for SLO
      this.sloManager.trackAlertLatency(
        message.messageId,
        topic,
        message.tenantId,
        message.createdAt
      );
      
      console.log(`Message ${message.messageId} sent to ${topic}`);
      return result;
      
    } catch (error) {
      await this.clearMessageSending(message.messageId);
      throw error;
    }
  }

  /**
   * Send failed message to Dead Letter Queue
   */
  private async sendToDLQ(
    originalTopic: string,
    message: IdempotentMessage,
    error: Error
  ): Promise<void> {
    const dlqTopic = `${originalTopic}.dlq`;
    
    try {
      const dlqMessage = {
        originalTopic,
        originalMessage: message,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        failedAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3
      };
      
      await this.producer.send({
        topic: dlqTopic,
        messages: [{
          key: `dlq-${message.messageId}`,
          value: JSON.stringify(dlqMessage),
          headers: {
            'original-topic': originalTopic,
            'original-message-id': message.messageId,
            'failed-at': dlqMessage.failedAt
          }
        }]
      });
      
      // Record DLQ metric
      this.sloManager.recordDLQMessage(
        originalTopic,
        error.name,
        message.tenantId,
        message
      );
      
      console.log(`Message ${message.messageId} sent to DLQ: ${dlqTopic}`);
      
    } catch (dlqError) {
      console.error(`Failed to send message ${message.messageId} to DLQ:`, dlqError);
    }
  }

  /**
   * Generate deterministic message ID
   */
  private generateMessageId(topic: string, message: Partial<IdempotentMessage>): string {
    const content = JSON.stringify({
      topic,
      key: message.key,
      value: message.value,
      tenantId: message.tenantId,
      timestamp: message.timestamp || Date.now()
    });
    
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Check if message was already sent
   */
  private async isMessageSent(messageId: string): Promise<boolean> {
    const exists = await this.redis.exists(`msg_sent:${messageId}`);
    return exists === 1;
  }

  /**
   * Mark message as being sent (temporary lock)
   */
  private async markMessageSending(messageId: string): Promise<void> {
    await this.redis.setex(`msg_sending:${messageId}`, 300, '1'); // 5 minute lock
  }

  /**
   * Clear message sending lock
   */
  private async clearMessageSending(messageId: string): Promise<void> {
    await this.redis.del(`msg_sending:${messageId}`);
  }

  /**
   * Mark message as successfully sent
   */
  private async markMessageSent(messageId: string, expiresAt?: Date): Promise<void> {
    const ttl = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / 1000) : 86400;
    await this.redis.setex(`msg_sent:${messageId}`, ttl, '1');
    await this.redis.del(`msg_sending:${messageId}`);
  }

  /**
   * Create default provenance for messages
   */
  private createDefaultProvenance(): IdempotentMessage['provenance'] {
    return {
      sourceSystem: 'intelgraph-platform',
      chainOfCustody: [{
        timestamp: new Date(),
        action: 'message_created',
        actor: this.producerId,
        metadata: {
          producerVersion: process.env.APP_VERSION || 'unknown',
          environment: process.env.NODE_ENV || 'development'
        }
      }]
    };
  }

  /**
   * Bulk send with idempotency (for high throughput scenarios)
   */
  async sendBatchIdempotent(
    topic: string,
    messages: Array<Partial<IdempotentMessage>>
  ): Promise<RecordMetadata[]> {
    const results: RecordMetadata[] = [];
    
    // Process in batches of 100 to avoid overwhelming Kafka
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchPromises = batch.map(msg => this.sendIdempotent(topic, msg));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(...result.value);
          } else {
            console.error(`Batch message ${i + index} failed:`, result.reason);
          }
        });
      } catch (error) {
        console.error(`Batch ${i}-${i + batchSize} failed:`, error);
      }
    }
    
    return results;
  }
}

export default IdempotentKafkaProducer;