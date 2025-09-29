import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import { Redis } from 'ioredis';
import { createHash } from 'crypto';
import { Command } from 'commander';

interface DLQMessage {
  originalTopic: string;
  originalMessage: any;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  failedAt: string;
  retryCount: number;
  maxRetries: number;
  replayHistory?: Array<{
    timestamp: string;
    actor: string;
    reason: string;
    success: boolean;
    error?: string;
  }>;
}

interface ReplayOptions {
  topic?: string;
  messageId?: string;
  failedAfter?: Date;
  failedBefore?: Date;
  errorType?: string;
  maxRetries?: number;
  dryRun?: boolean;
  batchSize?: number;
  reason?: string;
  actor?: string;
}

/**
 * Dead Letter Queue Replay Service
 * Handles DLQ message replay with immutable provenance tracking
 */
export class DLQReplayService {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private redis: Redis;
  private replayHistory = new Map<string, Array<any>>();

  constructor(kafka: Kafka, redis: Redis, consumerGroup = 'dlq-replay-service') {
    this.kafka = kafka;
    this.redis = redis;
    this.consumer = kafka.consumer({ 
      groupId: consumerGroup,
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
    this.producer = kafka.producer({
      idempotent: true,
      transactionTimeout: 30000
    });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
    await this.producer.disconnect();
  }

  /**
   * Scan DLQ topics and return available messages for replay
   */
  async scanDLQMessages(options: ReplayOptions = {}): Promise<Array<{
    topic: string;
    messageId: string;
    originalTopic: string;
    failedAt: string;
    error: string;
    retryCount: number;
    canRetry: boolean;
  }>> {
    const dlqMessages: Array<any> = [];
    const metadata = await this.kafka.admin().getTopicMetadata();
    
    // Find all DLQ topics
    const dlqTopics = metadata.topics
      .filter(topic => topic.name.endsWith('.dlq'))
      .map(topic => topic.name);

    console.log(`Found ${dlqTopics.length} DLQ topics: ${dlqTopics.join(', ')}`);

    // Scan each DLQ topic
    for (const topic of dlqTopics) {
      if (options.topic && !topic.startsWith(options.topic)) {
        continue;
      }

      try {
        const messages = await this.fetchDLQMessages(topic, options);
        dlqMessages.push(...messages);
      } catch (error) {
        console.error(`Error scanning DLQ topic ${topic}:`, error);
      }
    }

    return dlqMessages.sort((a, b) => 
      new Date(a.failedAt).getTime() - new Date(b.failedAt).getTime()
    );
  }

  /**
   * Replay messages from DLQ back to original topic
   */
  async replayMessages(options: ReplayOptions): Promise<{
    attempted: number;
    successful: number;
    failed: number;
    errors: Array<{ messageId: string; error: string }>;
  }> {
    if (!options.reason || !options.actor) {
      throw new Error('Replay requires reason and actor for audit trail');
    }

    const messages = await this.scanDLQMessages(options);
    const results = {
      attempted: 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ messageId: string; error: string }>
    };

    console.log(`Found ${messages.length} messages to replay`);

    if (options.dryRun) {
      console.log('DRY RUN - No messages will be replayed');
      messages.forEach(msg => {
        console.log(`Would replay: ${msg.messageId} from ${msg.topic} -> ${msg.originalTopic}`);
      });
      return results;
    }

    // Process in batches
    const batchSize = options.batchSize || 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(messages.length / batchSize)}`);
      
      const batchPromises = batch.map(msg => 
        this.replayMessage(msg, options.reason!, options.actor!)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        const msg = batch[index];
        results.attempted++;
        
        if (result.status === 'fulfilled' && result.value) {
          results.successful++;
        } else {
          results.failed++;
          const error = result.status === 'rejected' ? 
            result.reason.message : 
            'Unknown error';
          results.errors.push({ 
            messageId: msg.messageId, 
            error 
          });
        }
      });

      // Small delay between batches to avoid overwhelming Kafka
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Replay complete: ${results.successful}/${results.attempted} successful`);
    return results;
  }

  /**
   * Replay single message with immutable provenance
   */
  private async replayMessage(
    dlqMessage: any, 
    reason: string, 
    actor: string
  ): Promise<boolean> {
    const transaction = await this.producer.transaction();
    
    try {
      // Parse original message
      const originalMessage = dlqMessage.originalMessage;
      const replayId = this.generateReplayId(dlqMessage.messageId);
      
      // Create replay provenance entry
      const replayEntry = {
        timestamp: new Date().toISOString(),
        actor,
        reason,
        replayId,
        originalMessageId: dlqMessage.messageId,
        originalFailure: dlqMessage.error,
        success: false // Will be updated after successful replay
      };

      // Store immutable replay attempt record
      await this.storeReplayAttempt(dlqMessage.messageId, replayEntry);

      // Replay message to original topic with updated headers
      const replayHeaders = {
        ...originalMessage.headers,
        'replay-id': replayId,
        'replay-actor': actor,
        'replay-reason': reason,
        'replay-timestamp': replayEntry.timestamp,
        'original-failure': JSON.stringify(dlqMessage.error),
        'retry-count': (dlqMessage.retryCount + 1).toString()
      };

      await transaction.send({
        topic: dlqMessage.originalTopic,
        messages: [{
          key: originalMessage.key,
          value: originalMessage.value,
          headers: replayHeaders,
          partition: originalMessage.partition
        }]
      });

      // Mark original DLQ message as replayed (immutable record)
      await transaction.send({
        topic: `${dlqMessage.topic}.replayed`,
        messages: [{
          key: dlqMessage.messageId,
          value: JSON.stringify({
            ...dlqMessage,
            replayedAt: new Date().toISOString(),
            replayId,
            replayActor: actor,
            replayReason: reason
          }),
          headers: {
            'original-message-id': dlqMessage.messageId,
            'replay-id': replayId
          }
        }]
      });

      await transaction.commit();

      // Update replay entry as successful
      replayEntry.success = true;
      await this.updateReplayAttempt(dlqMessage.messageId, replayId, { success: true });

      console.log(`Successfully replayed message ${dlqMessage.messageId} to ${dlqMessage.originalTopic}`);
      return true;

    } catch (error) {
      await transaction.abort();
      console.error(`Failed to replay message ${dlqMessage.messageId}:`, error);
      
      // Record failed replay attempt
      await this.updateReplayAttempt(
        dlqMessage.messageId, 
        this.generateReplayId(dlqMessage.messageId), 
        { 
          success: false, 
          error: error.message 
        }
      );
      
      return false;
    }
  }

  /**
   * Fetch messages from specific DLQ topic
   */
  private async fetchDLQMessages(topic: string, options: ReplayOptions): Promise<Array<any>> {
    return new Promise(async (resolve, reject) => {
      const messages: Array<any> = [];
      const tempConsumer = this.kafka.consumer({ 
        groupId: `dlq-scan-${Date.now()}`,
        fromBeginning: true
      });

      try {
        await tempConsumer.connect();
        await tempConsumer.subscribe({ topic });

        const timeoutId = setTimeout(() => {
          tempConsumer.disconnect().then(() => resolve(messages));
        }, 10000); // 10 second timeout

        await tempConsumer.run({
          eachMessage: async ({ message }: EachMessagePayload) => {
            try {
              if (!message.value) return;
              
              const dlqMessage: DLQMessage = JSON.parse(message.value.toString());
              const messageId = message.headers?.['original-message-id']?.toString() || 
                               dlqMessage.originalMessage?.messageId || 
                               'unknown';

              // Apply filters
              if (options.messageId && messageId !== options.messageId) return;
              if (options.errorType && dlqMessage.error.name !== options.errorType) return;
              if (options.failedAfter && new Date(dlqMessage.failedAt) < options.failedAfter) return;
              if (options.failedBefore && new Date(dlqMessage.failedAt) > options.failedBefore) return;
              if (options.maxRetries && dlqMessage.retryCount >= options.maxRetries) return;

              messages.push({
                topic,
                messageId,
                originalTopic: dlqMessage.originalTopic,
                failedAt: dlqMessage.failedAt,
                error: dlqMessage.error.message,
                retryCount: dlqMessage.retryCount,
                canRetry: dlqMessage.retryCount < dlqMessage.maxRetries,
                originalMessage: dlqMessage.originalMessage
              });

            } catch (parseError) {
              console.warn(`Failed to parse DLQ message from ${topic}:`, parseError);
            }
          }
        });

      } catch (error) {
        clearTimeout(timeoutId);
        await tempConsumer.disconnect();
        reject(error);
      }
    });
  }

  /**
   * Store immutable replay attempt record
   */
  private async storeReplayAttempt(messageId: string, replayEntry: any): Promise<void> {
    const key = `replay_history:${messageId}`;
    await this.redis.lpush(key, JSON.stringify(replayEntry));
    await this.redis.expire(key, 30 * 24 * 60 * 60); // Keep for 30 days
  }

  /**
   * Update replay attempt record
   */
  private async updateReplayAttempt(
    messageId: string, 
    replayId: string, 
    updates: Partial<any>
  ): Promise<void> {
    const key = `replay_history:${messageId}`;
    const history = await this.redis.lrange(key, 0, -1);
    
    for (let i = 0; i < history.length; i++) {
      const entry = JSON.parse(history[i]);
      if (entry.replayId === replayId) {
        const updated = { ...entry, ...updates };
        await this.redis.lset(key, i, JSON.stringify(updated));
        break;
      }
    }
  }

  /**
   * Get replay history for a message
   */
  async getReplayHistory(messageId: string): Promise<Array<any>> {
    const key = `replay_history:${messageId}`;
    const history = await this.redis.lrange(key, 0, -1);
    return history.map(entry => JSON.parse(entry));
  }

  /**
   * Generate unique replay ID
   */
  private generateReplayId(originalMessageId: string): string {
    const content = `${originalMessageId}-${Date.now()}-${Math.random()}`;
    return createHash('sha256').update(content).digest('hex').substring(0, 12);
  }
}

/**
 * CLI interface for DLQ replay operations
 */
export class DLQReplayCLI {
  static async run(): Promise<void> {
    const program = new Command();

    program
      .name('dlq-replay')
      .description('IntelGraph DLQ Replay Tool')
      .version('1.0.0');

    // Scan command
    program
      .command('scan')
      .description('Scan DLQ topics for available messages')
      .option('-t, --topic <topic>', 'Filter by original topic')
      .option('--after <date>', 'Failed after date (ISO string)')
      .option('--before <date>', 'Failed before date (ISO string)')
      .option('--error-type <type>', 'Filter by error type')
      .action(async (options) => {
        const kafka = new Kafka({
          clientId: 'dlq-replay-cli',
          brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092']
        });

        const redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD
        });

        const replayService = new DLQReplayService(kafka, redis);
        
        try {
          await replayService.connect();
          
          const scanOptions: ReplayOptions = {
            topic: options.topic,
            failedAfter: options.after ? new Date(options.after) : undefined,
            failedBefore: options.before ? new Date(options.before) : undefined,
            errorType: options.errorType
          };

          const messages = await replayService.scanDLQMessages(scanOptions);
          
          console.log(`\nFound ${messages.length} messages in DLQ:\n`);
          messages.forEach(msg => {
            console.log(`${msg.messageId} | ${msg.originalTopic} | ${msg.failedAt} | ${msg.error} | Retries: ${msg.retryCount}`);
          });

        } finally {
          await replayService.disconnect();
          await redis.disconnect();
        }
      });

    // Replay command
    program
      .command('replay')
      .description('Replay messages from DLQ')
      .requiredOption('-r, --reason <reason>', 'Reason for replay')
      .requiredOption('-a, --actor <actor>', 'Actor performing replay')
      .option('-t, --topic <topic>', 'Filter by original topic')
      .option('-m, --message-id <id>', 'Replay specific message ID')
      .option('--after <date>', 'Failed after date (ISO string)')
      .option('--before <date>', 'Failed before date (ISO string)')
      .option('--error-type <type>', 'Filter by error type')
      .option('--max-retries <n>', 'Max retry count filter', parseInt)
      .option('--dry-run', 'Show what would be replayed without doing it')
      .option('--batch-size <n>', 'Batch size for processing', parseInt, 10)
      .action(async (options) => {
        const kafka = new Kafka({
          clientId: 'dlq-replay-cli',
          brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092']
        });

        const redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD
        });

        const replayService = new DLQReplayService(kafka, redis);
        
        try {
          await replayService.connect();
          
          const replayOptions: ReplayOptions = {
            topic: options.topic,
            messageId: options.messageId,
            failedAfter: options.after ? new Date(options.after) : undefined,
            failedBefore: options.before ? new Date(options.before) : undefined,
            errorType: options.errorType,
            maxRetries: options.maxRetries,
            dryRun: options.dryRun,
            batchSize: options.batchSize,
            reason: options.reason,
            actor: options.actor
          };

          const results = await replayService.replayMessages(replayOptions);
          
          console.log('\nReplay Results:');
          console.log(`Attempted: ${results.attempted}`);
          console.log(`Successful: ${results.successful}`);
          console.log(`Failed: ${results.failed}`);
          
          if (results.errors.length > 0) {
            console.log('\nErrors:');
            results.errors.forEach(err => {
              console.log(`${err.messageId}: ${err.error}`);
            });
          }

        } finally {
          await replayService.disconnect();
          await redis.disconnect();
        }
      });

    // History command
    program
      .command('history <messageId>')
      .description('Show replay history for a message')
      .action(async (messageId) => {
        const redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD
        });

        const kafka = new Kafka({
          clientId: 'dlq-replay-cli',
          brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092']
        });

        const replayService = new DLQReplayService(kafka, redis);
        
        try {
          const history = await replayService.getReplayHistory(messageId);
          
          console.log(`\nReplay history for message ${messageId}:\n`);
          history.forEach(entry => {
            console.log(`${entry.timestamp} | ${entry.actor} | ${entry.success ? 'SUCCESS' : 'FAILED'} | ${entry.reason}`);
            if (entry.error) {
              console.log(`  Error: ${entry.error}`);
            }
          });

        } finally {
          await redis.disconnect();
        }
      });

    await program.parseAsync();
  }
}

// CLI entry point
if (require.main === module) {
  DLQReplayCLI.run().catch(console.error);
}

export { DLQReplayService, DLQReplayCLI };