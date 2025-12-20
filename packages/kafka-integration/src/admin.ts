import { Kafka, Admin, ITopicConfig } from 'kafkajs';
import pino from 'pino';
import { KafkaClusterConfig, TopicConfig } from './types';

const logger = pino({ name: 'kafka-admin' });

/**
 * Kafka administration client for topic and cluster management
 */
export class KafkaAdmin {
  private kafka: Kafka;
  private admin: Admin | null = null;

  constructor(private config: KafkaClusterConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: config.sasl,
      connectionTimeout: config.connectionTimeout,
      requestTimeout: config.requestTimeout,
      retry: config.retry,
    });
  }

  /**
   * Connect admin client
   */
  async connect(): Promise<void> {
    this.admin = this.kafka.admin();
    await this.admin.connect();
    logger.info('Kafka admin connected');
  }

  /**
   * Create topic with configuration
   */
  async createTopic(config: TopicConfig): Promise<boolean> {
    if (!this.admin) {
      throw new Error('Admin not connected');
    }

    try {
      const topicConfig: ITopicConfig = {
        topic: config.name,
        numPartitions: config.numPartitions,
        replicationFactor: config.replicationFactor,
        configEntries: [],
      };

      if (config.retentionMs) {
        topicConfig.configEntries!.push({
          name: 'retention.ms',
          value: String(config.retentionMs),
        });
      }

      if (config.cleanupPolicy) {
        topicConfig.configEntries!.push({
          name: 'cleanup.policy',
          value: config.cleanupPolicy,
        });
      }

      if (config.compressionType) {
        topicConfig.configEntries!.push({
          name: 'compression.type',
          value: config.compressionType,
        });
      }

      if (config.minInsyncReplicas) {
        topicConfig.configEntries!.push({
          name: 'min.insync.replicas',
          value: String(config.minInsyncReplicas),
        });
      }

      if (config.segmentMs) {
        topicConfig.configEntries!.push({
          name: 'segment.ms',
          value: String(config.segmentMs),
        });
      }

      if (config.segmentBytes) {
        topicConfig.configEntries!.push({
          name: 'segment.bytes',
          value: String(config.segmentBytes),
        });
      }

      await this.admin.createTopics({
        topics: [topicConfig],
        waitForLeaders: true,
      });

      logger.info({ topic: config.name }, 'Topic created');
      return true;
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        logger.warn({ topic: config.name }, 'Topic already exists');
        return false;
      }
      logger.error({ error, topic: config.name }, 'Failed to create topic');
      throw error;
    }
  }

  /**
   * Delete topic
   */
  async deleteTopic(topic: string): Promise<void> {
    if (!this.admin) {
      throw new Error('Admin not connected');
    }

    try {
      await this.admin.deleteTopics({
        topics: [topic],
      });

      logger.info({ topic }, 'Topic deleted');
    } catch (error) {
      logger.error({ error, topic }, 'Failed to delete topic');
      throw error;
    }
  }

  /**
   * List all topics
   */
  async listTopics(): Promise<string[]> {
    if (!this.admin) {
      throw new Error('Admin not connected');
    }

    try {
      const topics = await this.admin.listTopics();
      return topics;
    } catch (error) {
      logger.error({ error }, 'Failed to list topics');
      throw error;
    }
  }

  /**
   * Get topic metadata
   */
  async getTopicMetadata(topic: string): Promise<any> {
    if (!this.admin) {
      throw new Error('Admin not connected');
    }

    try {
      const metadata = await this.admin.fetchTopicMetadata({
        topics: [topic],
      });
      return metadata.topics[0];
    } catch (error) {
      logger.error({ error, topic }, 'Failed to get topic metadata');
      throw error;
    }
  }

  /**
   * Create partitions for existing topic
   */
  async createPartitions(topic: string, count: number): Promise<void> {
    if (!this.admin) {
      throw new Error('Admin not connected');
    }

    try {
      await this.admin.createPartitions({
        topicPartitions: [
          {
            topic,
            count,
          },
        ],
      });

      logger.info({ topic, count }, 'Partitions created');
    } catch (error) {
      logger.error({ error, topic }, 'Failed to create partitions');
      throw error;
    }
  }

  /**
   * Get consumer group offsets
   */
  async getConsumerGroupOffsets(groupId: string): Promise<any> {
    if (!this.admin) {
      throw new Error('Admin not connected');
    }

    try {
      const offsets = await this.admin.fetchOffsets({
        groupId,
      });
      return offsets;
    } catch (error) {
      logger.error({ error, groupId }, 'Failed to get consumer group offsets');
      throw error;
    }
  }

  /**
   * Reset consumer group offsets
   */
  async resetConsumerGroupOffsets(
    groupId: string,
    topic: string,
    partition: number,
    offset: string
  ): Promise<void> {
    if (!this.admin) {
      throw new Error('Admin not connected');
    }

    try {
      await this.admin.resetOffsets({
        groupId,
        topic,
        partitions: [{ partition, offset }],
      });

      logger.info({ groupId, topic, partition, offset }, 'Offsets reset');
    } catch (error) {
      logger.error({ error, groupId }, 'Failed to reset offsets');
      throw error;
    }
  }

  /**
   * Disconnect admin client
   */
  async disconnect(): Promise<void> {
    if (this.admin) {
      await this.admin.disconnect();
      this.admin = null;
      logger.info('Kafka admin disconnected');
    }
  }
}
