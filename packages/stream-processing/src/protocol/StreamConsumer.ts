/**
 * Stream Consumer
 * High-performance consumer with consumer groups, offset management, and rebalancing
 */

import { EventEmitter } from 'events';
import type { ConsumerConfig, ConsumerRecord, OffsetCommitRequest } from '../types.js';
import { MessageBroker } from '../broker/MessageBroker.js';

export class StreamConsumer extends EventEmitter {
  private config: ConsumerConfig;
  private brokers: Map<string, MessageBroker> = new Map();
  private subscriptions: Set<string> = new Set();
  private assignments: Map<string, number[]> = new Map();
  private offsets: Map<string, number> = new Map();
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timer | null = null;

  constructor(config: ConsumerConfig) {
    super();
    this.config = {
      autoOffsetReset: 'latest',
      enableAutoCommit: true,
      autoCommitIntervalMs: 5000,
      sessionTimeoutMs: 30000,
      heartbeatIntervalMs: 3000,
      maxPollRecords: 500,
      maxPollIntervalMs: 300000,
      isolationLevel: 'read_uncommitted',
      ...config,
    };
  }

  /**
   * Connect to brokers
   */
  async connect(brokers: Map<string, MessageBroker>): Promise<void> {
    this.brokers = brokers;
    console.log(`Consumer ${this.config.clientId} connected to ${brokers.size} brokers`);
  }

  /**
   * Subscribe to topics
   */
  async subscribe(topics: string[]): Promise<void> {
    for (const topic of topics) {
      this.subscriptions.add(topic);
    }

    // Trigger rebalance
    await this.rebalance();

    console.log(`Consumer ${this.config.groupId} subscribed to topics: ${topics.join(', ')}`);
  }

  /**
   * Unsubscribe from topics
   */
  async unsubscribe(topics?: string[]): Promise<void> {
    if (!topics) {
      this.subscriptions.clear();
    } else {
      for (const topic of topics) {
        this.subscriptions.delete(topic);
      }
    }

    await this.rebalance();
  }

  /**
   * Assign specific partitions to this consumer
   */
  async assign(assignments: Map<string, number[]>): Promise<void> {
    this.assignments = assignments;

    // Initialize offsets for assigned partitions
    for (const [topic, partitions] of assignments) {
      for (const partition of partitions) {
        const key = `${topic}-${partition}`;
        if (!this.offsets.has(key)) {
          // Set initial offset based on auto.offset.reset
          const offset = this.config.autoOffsetReset === 'earliest' ? 0 : -1;
          this.offsets.set(key, offset);
        }
      }
    }

    console.log(`Consumer assigned partitions:`, assignments);
  }

  /**
   * Poll for messages
   */
  async poll(timeoutMs: number = 1000): Promise<ConsumerRecord[]> {
    const messages: ConsumerRecord[] = [];

    for (const [topic, partitions] of this.assignments) {
      for (const partition of partitions) {
        const key = `${topic}-${partition}`;
        const offset = this.offsets.get(key) || 0;

        // Get messages from broker
        const broker = Array.from(this.brokers.values())[0];
        if (!broker) continue;

        try {
          const records = await broker.consume(
            topic,
            partition,
            offset,
            this.config.maxPollRecords!
          );

          messages.push(...records);

          // Update offset
          if (records.length > 0) {
            const lastOffset = records[records.length - 1].offset;
            this.offsets.set(key, lastOffset + 1);
          }
        } catch (error) {
          console.error(`Error polling ${topic}:${partition}:`, error);
        }
      }
    }

    // Auto-commit if enabled
    if (this.config.enableAutoCommit) {
      await this.commitOffsets();
    }

    return messages;
  }

  /**
   * Start consuming messages
   */
  async start(messageHandler: (record: ConsumerRecord) => Promise<void>): Promise<void> {
    if (this.isRunning) {
      throw new Error('Consumer already running');
    }

    this.isRunning = true;

    // Start polling loop
    this.pollTimer = setInterval(async () => {
      const messages = await this.poll();

      for (const message of messages) {
        try {
          await messageHandler(message);
        } catch (error) {
          console.error('Error processing message:', error);
          this.emit('error', error);
        }
      }
    }, 100); // Poll every 100ms

    console.log(`Consumer ${this.config.groupId} started`);
  }

  /**
   * Stop consuming messages
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    // Commit final offsets
    await this.commitOffsets();

    console.log(`Consumer ${this.config.groupId} stopped`);
  }

  /**
   * Commit offsets
   */
  async commitOffsets(offsets?: OffsetCommitRequest[]): Promise<void> {
    const commits = offsets || this.getOffsetsToCommit();

    for (const commit of commits) {
      // In a real implementation, this would commit to a metadata store
      console.log(
        `Committed offset ${commit.offset} for ${commit.topic}:${commit.partition}`
      );
    }

    this.emit('offsets:committed', commits);
  }

  /**
   * Seek to a specific offset
   */
  async seek(topic: string, partition: number, offset: number): Promise<void> {
    const key = `${topic}-${partition}`;
    this.offsets.set(key, offset);
    console.log(`Seeked to offset ${offset} for ${topic}:${partition}`);
  }

  /**
   * Seek to beginning of partitions
   */
  async seekToBeginning(topics?: string[]): Promise<void> {
    const targetTopics = topics || Array.from(this.subscriptions);

    for (const topic of targetTopics) {
      const partitions = this.assignments.get(topic) || [];
      for (const partition of partitions) {
        await this.seek(topic, partition, 0);
      }
    }
  }

  /**
   * Seek to end of partitions
   */
  async seekToEnd(topics?: string[]): Promise<void> {
    const targetTopics = topics || Array.from(this.subscriptions);

    for (const topic of targetTopics) {
      const partitions = this.assignments.get(topic) || [];
      for (const partition of partitions) {
        // Get high watermark from broker
        const broker = Array.from(this.brokers.values())[0];
        if (broker) {
          const metadata = await broker.getPartitionInfo(topic, partition);
          await this.seek(topic, partition, -1); // -1 will be resolved to high watermark
        }
      }
    }
  }

  /**
   * Close the consumer
   */
  async close(): Promise<void> {
    await this.stop();
    await this.commitOffsets();
    console.log(`Consumer ${this.config.clientId} closed`);
  }

  /**
   * Trigger consumer group rebalance
   */
  private async rebalance(): Promise<void> {
    // In a real implementation, this would:
    // 1. Join consumer group
    // 2. Participate in rebalance protocol
    // 3. Get partition assignments
    // 4. Revoke old assignments
    // 5. Assign new partitions

    // For now, assign all partitions of subscribed topics
    const newAssignments = new Map<string, number[]>();

    for (const topic of this.subscriptions) {
      const broker = Array.from(this.brokers.values())[0];
      if (broker) {
        try {
          const partitions = await broker.getTopicPartitions(topic);
          newAssignments.set(
            topic,
            partitions.map(p => p.partition)
          );
        } catch (error) {
          console.error(`Error getting partitions for ${topic}:`, error);
        }
      }
    }

    await this.assign(newAssignments);
  }

  /**
   * Get offsets to commit
   */
  private getOffsetsToCommit(): OffsetCommitRequest[] {
    const commits: OffsetCommitRequest[] = [];

    for (const [key, offset] of this.offsets) {
      const [topic, partitionStr] = key.split('-');
      const partition = parseInt(partitionStr);

      commits.push({
        groupId: this.config.groupId,
        topic,
        partition,
        offset,
      });
    }

    return commits;
  }
}
