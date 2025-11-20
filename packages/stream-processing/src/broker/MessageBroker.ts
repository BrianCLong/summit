/**
 * Distributed Message Broker
 * Implements Kafka-compatible message broker with multi-broker replication
 */

import { EventEmitter } from 'events';
import type {
  BrokerConfig,
  TopicConfig,
  ProducerRecord,
  ProducerResult,
  ConsumerRecord,
  Partition,
  StreamMetrics,
} from '../types.js';
import { TopicManager } from './TopicManager.js';
import { PartitionManager } from '../partition/PartitionManager.js';
import { ReplicationManager } from '../replication/ReplicationManager.js';
import { StorageEngine } from '../storage/StorageEngine.js';

export class MessageBroker extends EventEmitter {
  private config: BrokerConfig;
  private topicManager: TopicManager;
  private partitionManager: PartitionManager;
  private replicationManager: ReplicationManager;
  private storageEngine: StorageEngine;
  private isLeader: boolean = false;
  private isRunning: boolean = false;
  private metrics: StreamMetrics;

  constructor(config: BrokerConfig) {
    super();
    this.config = config;
    this.topicManager = new TopicManager(config);
    this.partitionManager = new PartitionManager(config);
    this.replicationManager = new ReplicationManager(config);
    this.storageEngine = new StorageEngine(config);
    this.metrics = this.initializeMetrics();
  }

  /**
   * Start the message broker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Broker already running');
    }

    console.log(`Starting broker ${this.config.brokerId} on ${this.config.host}:${this.config.port}`);

    // Initialize storage
    await this.storageEngine.initialize();

    // Start partition manager
    await this.partitionManager.start();

    // Start replication manager
    await this.replicationManager.start();

    // Perform leader election
    await this.performLeaderElection();

    this.isRunning = true;
    this.emit('broker:started', { brokerId: this.config.brokerId });

    // Start metrics collection
    this.startMetricsCollection();
  }

  /**
   * Stop the message broker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log(`Stopping broker ${this.config.brokerId}`);

    await this.replicationManager.stop();
    await this.partitionManager.stop();
    await this.storageEngine.close();

    this.isRunning = false;
    this.emit('broker:stopped', { brokerId: this.config.brokerId });
  }

  /**
   * Create a new topic
   */
  async createTopic(config: TopicConfig): Promise<void> {
    if (!this.isLeader) {
      throw new Error('Only leader broker can create topics');
    }

    await this.topicManager.createTopic(config);

    // Create partitions for the topic
    const partitions = await this.partitionManager.createPartitions(
      config.name,
      config.partitions,
      config.replicationFactor
    );

    // Setup replication for partitions
    await this.replicationManager.setupReplication(config.name, partitions);

    this.emit('topic:created', { topic: config.name });
  }

  /**
   * Delete a topic
   */
  async deleteTopic(topicName: string): Promise<void> {
    if (!this.isLeader) {
      throw new Error('Only leader broker can delete topics');
    }

    await this.topicManager.deleteTopic(topicName);
    await this.partitionManager.deletePartitions(topicName);
    await this.replicationManager.removeReplication(topicName);

    this.emit('topic:deleted', { topic: topicName });
  }

  /**
   * Produce a message to a topic
   */
  async produce(record: ProducerRecord): Promise<ProducerResult> {
    if (!this.isRunning) {
      throw new Error('Broker not running');
    }

    // Validate topic exists
    const topicExists = await this.topicManager.topicExists(record.topic);
    if (!topicExists) {
      if (this.config.autoCreateTopics) {
        await this.createTopic({
          name: record.topic,
          partitions: this.config.numPartitions || 3,
          replicationFactor: this.config.defaultReplicationFactor || 2,
        });
      } else {
        throw new Error(`Topic ${record.topic} does not exist`);
      }
    }

    // Determine partition
    const partition = record.partition ??
      await this.partitionManager.selectPartition(record.topic, record.key);

    // Check if this broker is the leader for the partition
    const isPartitionLeader = await this.partitionManager.isPartitionLeader(
      record.topic,
      partition
    );

    if (!isPartitionLeader) {
      // Forward to leader broker
      const leader = await this.partitionManager.getPartitionLeader(record.topic, partition);
      throw new Error(`Not leader for partition. Leader is broker ${leader}`);
    }

    // Write to storage
    const offset = await this.storageEngine.append(record.topic, partition, {
      key: record.key?.toString() || null,
      value: typeof record.value === 'string' ? record.value : record.value.toString(),
      headers: record.headers,
      timestamp: record.timestamp || Date.now(),
      offset: 0, // Will be assigned by storage
      partition,
      topic: record.topic,
    });

    // Replicate to followers
    await this.replicationManager.replicate(record.topic, partition, offset);

    // Update metrics
    this.metrics.messagesInPerSec++;
    this.metrics.bytesInPerSec += Buffer.byteLength(record.value.toString());

    this.emit('message:produced', { topic: record.topic, partition, offset });

    return {
      topic: record.topic,
      partition,
      offset,
      timestamp: record.timestamp || Date.now(),
    };
  }

  /**
   * Consume messages from a topic partition
   */
  async consume(
    topic: string,
    partition: number,
    offset: number,
    maxMessages: number = 100
  ): Promise<ConsumerRecord[]> {
    if (!this.isRunning) {
      throw new Error('Broker not running');
    }

    const messages = await this.storageEngine.read(topic, partition, offset, maxMessages);

    // Update metrics
    this.metrics.messagesOutPerSec += messages.length;
    this.metrics.bytesOutPerSec += messages.reduce(
      (sum, msg) => sum + Buffer.byteLength(msg.value.toString()),
      0
    );

    this.emit('messages:consumed', { topic, partition, count: messages.length });

    return messages;
  }

  /**
   * Get topic metadata
   */
  async getTopicMetadata(topicName: string): Promise<TopicConfig> {
    return this.topicManager.getTopicConfig(topicName);
  }

  /**
   * Get partition information
   */
  async getPartitionInfo(topic: string, partition: number): Promise<Partition> {
    return this.partitionManager.getPartitionInfo(topic, partition);
  }

  /**
   * Get all partitions for a topic
   */
  async getTopicPartitions(topic: string): Promise<Partition[]> {
    return this.partitionManager.getTopicPartitions(topic);
  }

  /**
   * Get broker metrics
   */
  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  /**
   * Perform leader election (simplified version)
   */
  private async performLeaderElection(): Promise<void> {
    // In a real implementation, this would use ZooKeeper or Raft
    // For now, broker 0 is always the leader
    this.isLeader = this.config.brokerId === 0;

    if (this.isLeader) {
      console.log(`Broker ${this.config.brokerId} elected as leader`);
      this.metrics.activeControllerCount = 1;
    }
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): StreamMetrics {
    return {
      messagesInPerSec: 0,
      messagesOutPerSec: 0,
      bytesInPerSec: 0,
      bytesOutPerSec: 0,
      producerRequestRate: 0,
      consumerRequestRate: 0,
      replicationBytesInPerSec: 0,
      replicationBytesOutPerSec: 0,
      underReplicatedPartitions: 0,
      offlinePartitionsCount: 0,
      activeControllerCount: 0,
      leaderElectionRate: 0,
      uncleanLeaderElectionsPerSec: 0,
    };
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      // Reset rate-based metrics every second
      this.metrics.messagesInPerSec = 0;
      this.metrics.messagesOutPerSec = 0;
      this.metrics.bytesInPerSec = 0;
      this.metrics.bytesOutPerSec = 0;

      this.emit('metrics:updated', this.metrics);
    }, 1000);
  }

  /**
   * Get broker ID
   */
  getBrokerId(): number {
    return this.config.brokerId;
  }

  /**
   * Check if broker is leader
   */
  isLeaderBroker(): boolean {
    return this.isLeader;
  }
}
