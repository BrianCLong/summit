import { Kafka, Producer, KafkaMessage } from 'kafkajs';
import pino from 'pino';

const logger = pino({ name: 'dlq' });

/**
 * Dead Letter Queue for failed message handling
 */
export class DeadLetterQueue {
  private producer: Producer | null = null;
  private retryCount: Map<string, number> = new Map();

  constructor(
    private kafka: Kafka,
    private dlqTopic: string,
    private maxRetries: number = 3
  ) {}

  /**
   * Connect DLQ producer
   */
  async connect(): Promise<void> {
    this.producer = this.kafka.producer({
      idempotent: true,
    });

    await this.producer.connect();
    logger.info({ dlqTopic: this.dlqTopic }, 'DLQ producer connected');
  }

  /**
   * Send failed message to DLQ
   */
  async send(
    originalTopic: string,
    message: KafkaMessage,
    error: Error
  ): Promise<void> {
    if (!this.producer) {
      throw new Error('DLQ producer not connected');
    }

    const messageKey = `${originalTopic}-${message.offset}`;
    const currentRetries = this.retryCount.get(messageKey) || 0;

    if (currentRetries >= this.maxRetries) {
      logger.error(
        {
          originalTopic,
          offset: message.offset,
          retries: currentRetries,
        },
        'Message exceeded max retries, sending to DLQ'
      );

      await this.producer.send({
        topic: this.dlqTopic,
        messages: [
          {
            key: message.key,
            value: message.value,
            headers: {
              ...message.headers,
              'dlq.original-topic': originalTopic,
              'dlq.original-offset': message.offset,
              'dlq.error': error.message,
              'dlq.retry-count': String(currentRetries),
              'dlq.timestamp': Date.now().toString(),
            },
          },
        ],
      });

      this.retryCount.delete(messageKey);
    } else {
      this.retryCount.set(messageKey, currentRetries + 1);
      logger.warn(
        {
          originalTopic,
          offset: message.offset,
          retries: currentRetries + 1,
        },
        'Message will be retried'
      );
    }
  }

  /**
   * Disconnect DLQ producer
   */
  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
      logger.info('DLQ producer disconnected');
    }
  }

  /**
   * Get retry count for message
   */
  getRetryCount(topic: string, offset: string): number {
    return this.retryCount.get(`${topic}-${offset}`) || 0;
  }

  /**
   * Clear retry count
   */
  clearRetryCount(topic: string, offset: string): void {
    this.retryCount.delete(`${topic}-${offset}`);
  }
}
