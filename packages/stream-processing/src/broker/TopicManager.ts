/**
 * Topic Management
 * Handles topic creation, deletion, and configuration
 */

import type { BrokerConfig, TopicConfig } from '../types.js';

export class TopicManager {
  private topics: Map<string, TopicConfig> = new Map();
  private config: BrokerConfig;

  constructor(config: BrokerConfig) {
    this.config = config;
  }

  /**
   * Create a new topic
   */
  async createTopic(topicConfig: TopicConfig): Promise<void> {
    if (this.topics.has(topicConfig.name)) {
      throw new Error(`Topic ${topicConfig.name} already exists`);
    }

    // Set defaults
    const config: TopicConfig = {
      ...topicConfig,
      retentionMs: topicConfig.retentionMs ?? 7 * 24 * 60 * 60 * 1000, // 7 days
      retentionBytes: topicConfig.retentionBytes ?? -1, // unlimited
      segmentMs: topicConfig.segmentMs ?? 7 * 24 * 60 * 60 * 1000, // 7 days
      segmentBytes: topicConfig.segmentBytes ?? 1024 * 1024 * 1024, // 1GB
      compressionType: topicConfig.compressionType ?? 'none',
      minInSyncReplicas: topicConfig.minInSyncReplicas ?? 1,
      cleanupPolicy: topicConfig.cleanupPolicy ?? 'delete',
      maxMessageBytes: topicConfig.maxMessageBytes ?? 1024 * 1024, // 1MB
    };

    this.topics.set(config.name, config);
    console.log(`Topic created: ${config.name} with ${config.partitions} partitions`);
  }

  /**
   * Delete a topic
   */
  async deleteTopic(topicName: string): Promise<void> {
    if (!this.topics.has(topicName)) {
      throw new Error(`Topic ${topicName} does not exist`);
    }

    this.topics.delete(topicName);
    console.log(`Topic deleted: ${topicName}`);
  }

  /**
   * Check if topic exists
   */
  async topicExists(topicName: string): Promise<boolean> {
    return this.topics.has(topicName);
  }

  /**
   * Get topic configuration
   */
  async getTopicConfig(topicName: string): Promise<TopicConfig> {
    const config = this.topics.get(topicName);
    if (!config) {
      throw new Error(`Topic ${topicName} does not exist`);
    }
    return { ...config };
  }

  /**
   * Update topic configuration
   */
  async updateTopicConfig(topicName: string, updates: Partial<TopicConfig>): Promise<void> {
    const config = this.topics.get(topicName);
    if (!config) {
      throw new Error(`Topic ${topicName} does not exist`);
    }

    // Update configuration
    Object.assign(config, updates);
    console.log(`Topic configuration updated: ${topicName}`);
  }

  /**
   * List all topics
   */
  async listTopics(): Promise<string[]> {
    return Array.from(this.topics.keys());
  }

  /**
   * Get all topic configurations
   */
  async getAllTopicConfigs(): Promise<TopicConfig[]> {
    return Array.from(this.topics.values());
  }
}
