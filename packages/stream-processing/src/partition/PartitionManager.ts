/**
 * Partition Management
 * Handles partition assignment, leader election, and rebalancing
 */

import crypto from 'crypto';
import type { BrokerConfig, Partition, PartitionMetadata } from '../types.js';

export class PartitionManager {
  private partitions: Map<string, Map<number, Partition>> = new Map();
  private config: BrokerConfig;
  private partitionMetadata: Map<string, Map<number, PartitionMetadata>> = new Map();

  constructor(config: BrokerConfig) {
    this.config = config;
  }

  /**
   * Start partition manager
   */
  async start(): Promise<void> {
    console.log('Partition manager started');
  }

  /**
   * Stop partition manager
   */
  async stop(): Promise<void> {
    console.log('Partition manager stopped');
  }

  /**
   * Create partitions for a topic
   */
  async createPartitions(
    topic: string,
    numPartitions: number,
    replicationFactor: number
  ): Promise<Partition[]> {
    if (this.partitions.has(topic)) {
      throw new Error(`Partitions for topic ${topic} already exist`);
    }

    const topicPartitions = new Map<number, Partition>();
    const topicMetadata = new Map<number, PartitionMetadata>();
    const partitionList: Partition[] = [];

    for (let i = 0; i < numPartitions; i++) {
      // Assign leader and replicas
      const leader = this.selectLeader(topic, i);
      const replicas = this.selectReplicas(leader, replicationFactor);

      const partition: Partition = {
        topic,
        partition: i,
        leader,
        replicas,
        isr: replicas, // Initially all replicas are in-sync
        offlineReplicas: [],
      };

      const metadata: PartitionMetadata = {
        partition: i,
        leader,
        replicas,
        isr: replicas,
        highWaterMark: 0,
        logStartOffset: 0,
        logEndOffset: 0,
      };

      topicPartitions.set(i, partition);
      topicMetadata.set(i, metadata);
      partitionList.push(partition);
    }

    this.partitions.set(topic, topicPartitions);
    this.partitionMetadata.set(topic, topicMetadata);

    console.log(`Created ${numPartitions} partitions for topic ${topic}`);
    return partitionList;
  }

  /**
   * Delete all partitions for a topic
   */
  async deletePartitions(topic: string): Promise<void> {
    this.partitions.delete(topic);
    this.partitionMetadata.delete(topic);
    console.log(`Deleted partitions for topic ${topic}`);
  }

  /**
   * Select partition for a message
   */
  async selectPartition(topic: string, key?: string | Buffer): Promise<number> {
    const topicPartitions = this.partitions.get(topic);
    if (!topicPartitions) {
      throw new Error(`Topic ${topic} does not exist`);
    }

    const numPartitions = topicPartitions.size;

    if (!key) {
      // Round-robin for messages without keys
      return Math.floor(Math.random() * numPartitions);
    }

    // Hash-based partitioning for keyed messages
    const keyString = typeof key === 'string' ? key : key.toString();
    const hash = crypto.createHash('md5').update(keyString).digest('hex');
    const hashNum = parseInt(hash.substring(0, 8), 16);
    return hashNum % numPartitions;
  }

  /**
   * Check if this broker is the leader for a partition
   */
  async isPartitionLeader(topic: string, partition: number): Promise<boolean> {
    const partitionInfo = await this.getPartitionInfo(topic, partition);
    return partitionInfo.leader === this.config.brokerId;
  }

  /**
   * Get partition leader
   */
  async getPartitionLeader(topic: string, partition: number): Promise<number> {
    const partitionInfo = await this.getPartitionInfo(topic, partition);
    return partitionInfo.leader;
  }

  /**
   * Get partition information
   */
  async getPartitionInfo(topic: string, partition: number): Promise<Partition> {
    const topicPartitions = this.partitions.get(topic);
    if (!topicPartitions) {
      throw new Error(`Topic ${topic} does not exist`);
    }

    const partitionInfo = topicPartitions.get(partition);
    if (!partitionInfo) {
      throw new Error(`Partition ${partition} does not exist for topic ${topic}`);
    }

    return { ...partitionInfo };
  }

  /**
   * Get all partitions for a topic
   */
  async getTopicPartitions(topic: string): Promise<Partition[]> {
    const topicPartitions = this.partitions.get(topic);
    if (!topicPartitions) {
      throw new Error(`Topic ${topic} does not exist`);
    }

    return Array.from(topicPartitions.values());
  }

  /**
   * Get partition metadata
   */
  async getPartitionMetadata(topic: string, partition: number): Promise<PartitionMetadata> {
    const topicMetadata = this.partitionMetadata.get(topic);
    if (!topicMetadata) {
      throw new Error(`Topic ${topic} does not exist`);
    }

    const metadata = topicMetadata.get(partition);
    if (!metadata) {
      throw new Error(`Partition ${partition} does not exist for topic ${topic}`);
    }

    return { ...metadata };
  }

  /**
   * Update partition metadata
   */
  async updatePartitionMetadata(
    topic: string,
    partition: number,
    updates: Partial<PartitionMetadata>
  ): Promise<void> {
    const topicMetadata = this.partitionMetadata.get(topic);
    if (!topicMetadata) {
      throw new Error(`Topic ${topic} does not exist`);
    }

    const metadata = topicMetadata.get(partition);
    if (!metadata) {
      throw new Error(`Partition ${partition} does not exist for topic ${topic}`);
    }

    Object.assign(metadata, updates);
  }

  /**
   * Trigger partition rebalancing
   */
  async rebalancePartitions(topic: string): Promise<void> {
    // In a real implementation, this would reassign partitions across brokers
    console.log(`Rebalancing partitions for topic ${topic}`);
  }

  /**
   * Select leader for a partition
   */
  private selectLeader(topic: string, partition: number): number {
    // Simple round-robin leader selection
    // In real Kafka, this would be more sophisticated
    return partition % 3; // Assuming 3 brokers
  }

  /**
   * Select replicas for a partition
   */
  private selectReplicas(leader: number, replicationFactor: number): number[] {
    const replicas: number[] = [leader];
    const totalBrokers = 3; // Assuming 3 brokers

    for (let i = 1; i < replicationFactor && replicas.length < totalBrokers; i++) {
      const replica = (leader + i) % totalBrokers;
      if (!replicas.includes(replica)) {
        replicas.push(replica);
      }
    }

    return replicas;
  }
}
