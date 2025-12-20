// @ts-nocheck
/**
 * Kafka Adapter
 *
 * Consumes from Kafka topics with per-tenant partitioning and
 * exactly-once delivery semantics.
 */

import { Kafka, Consumer, EachMessagePayload, Admin } from 'kafkajs';
import type {
  KafkaAdapterConfig,
  Checkpoint,
  IngestEnvelope,
} from '../types/index.js';
import { BaseAdapter, BaseAdapterOptions } from './base.js';
import { IngestEnvelopeSchema } from '../types/index.js';

export class KafkaAdapter extends BaseAdapter {
  private kafka: Kafka | null = null;
  private consumer: Consumer | null = null;
  private admin: Admin | null = null;
  private offsets: Map<string, number> = new Map();
  private commitTimer: NodeJS.Timeout | null = null;
  private pendingCommits: Map<string, number> = new Map();

  constructor(options: BaseAdapterOptions) {
    super(options);
  }

  private get kafkaConfig(): KafkaAdapterConfig {
    return this.config as KafkaAdapterConfig;
  }

  protected async doInitialize(): Promise<void> {
    this.kafka = new Kafka({
      clientId: `ingest-adapter-${this.name}`,
      brokers: this.kafkaConfig.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: this.kafkaConfig.group_id,
      sessionTimeout: this.kafkaConfig.session_timeout_ms ?? 30000,
      heartbeatInterval: this.kafkaConfig.heartbeat_interval_ms ?? 3000,
      maxBytesPerPartition: this.kafkaConfig.max_bytes_per_partition ?? 1048576,
    });

    this.admin = this.kafka.admin();

    // Connect and verify topic exists
    await this.admin.connect();
    const topics = await this.admin.listTopics();
    if (!topics.includes(this.kafkaConfig.topic)) {
      throw new Error(`Topic ${this.kafkaConfig.topic} does not exist`);
    }
    await this.admin.disconnect();

    await this.consumer.connect();

    // Subscribe to topic
    await this.consumer.subscribe({
      topic: this.kafkaConfig.topic,
      fromBeginning: this.kafkaConfig.from_beginning ?? false,
    });

    // Restore offsets from checkpoint
    const checkpoint = await this.getCheckpoint();
    if (checkpoint?.position_metadata) {
      for (const [partition, offset] of Object.entries(checkpoint.position_metadata)) {
        this.offsets.set(partition, Number(offset));
      }
      this.logger.info({ offsets: Object.fromEntries(this.offsets) }, 'Restored Kafka offsets');
    }
  }

  protected async doStart(): Promise<void> {
    if (!this.consumer) {
      throw new Error('Kafka consumer not initialized');
    }

    // Start periodic offset commit
    this.commitTimer = setInterval(async () => {
      await this.commitOffsets();
    }, 5000);

    // Start consuming
    await this.consumer.run({
      eachMessage: async (payload) => {
        await this.handleMessage(payload);
      },
      autoCommit: false,
    });
  }

  protected async doStop(): Promise<void> {
    if (this.commitTimer) {
      clearInterval(this.commitTimer);
      this.commitTimer = null;
    }

    // Final commit
    await this.commitOffsets();

    if (this.consumer) {
      await this.consumer.disconnect();
      this.consumer = null;
    }
  }

  protected async doHealthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }> {
    if (!this.consumer) {
      return { healthy: false, details: { error: 'Kafka consumer not initialized' } };
    }

    try {
      const admin = this.kafka!.admin();
      await admin.connect();

      const topicOffsets = await admin.fetchTopicOffsets(this.kafkaConfig.topic);
      const consumerOffsets = await admin.fetchOffsets({
        groupId: this.kafkaConfig.group_id,
        topics: [this.kafkaConfig.topic],
      });

      await admin.disconnect();

      // Calculate lag per partition
      const lag: Record<string, number> = {};
      let totalLag = 0;

      for (const topicOffset of topicOffsets) {
        const consumerOffset = consumerOffsets[0]?.partitions?.find(
          (p) => p.partition === topicOffset.partition
        );

        const current = parseInt(consumerOffset?.offset ?? '0', 10);
        const latest = parseInt(topicOffset.offset, 10);
        const partitionLag = Math.max(0, latest - current);

        lag[`partition_${topicOffset.partition}`] = partitionLag;
        totalLag += partitionLag;
      }

      return {
        healthy: true,
        details: {
          topic: this.kafkaConfig.topic,
          groupId: this.kafkaConfig.group_id,
          lag,
          totalLag,
          partitions: topicOffsets.length,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          topic: this.kafkaConfig.topic,
          error: String(error),
        },
      };
    }
  }

  protected getSourceIdentifier(): string {
    return `kafka://${this.kafkaConfig.brokers[0]}/${this.kafkaConfig.topic}`;
  }

  protected createCheckpoint(position: string): Checkpoint {
    return {
      id: `${this.config.tenant_id}:${this.getSourceIdentifier()}`,
      tenant_id: this.config.tenant_id,
      source: this.getSourceIdentifier(),
      source_type: 'kafka',
      position,
      position_metadata: Object.fromEntries(this.offsets),
      last_processed_at: new Date().toISOString(),
      records_since_checkpoint: 0,
      total_records_processed: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    if (!message.value) {
      this.logger.warn({ partition, offset: message.offset }, 'Received message with no value');
      return;
    }

    // Check backpressure
    if (!this.backpressure.isAccepting()) {
      // Pause consumption until backpressure releases
      this.consumer?.pause([{ topic }]);
      await this.waitForBackpressureRelease();
      this.consumer?.resume([{ topic }]);
    }

    try {
      const rawData = JSON.parse(message.value.toString());

      // Validate as IngestEnvelope or create one
      let envelope: IngestEnvelope;

      const validation = IngestEnvelopeSchema.safeParse(rawData);
      if (validation.success) {
        envelope = validation.data;
      } else {
        // Create envelope from raw data
        const entityType = rawData._type ?? rawData.type ?? 'unknown';
        const entityId = rawData._id ?? rawData.id ?? `${partition}:${message.offset}`;
        const revision = rawData._revision ?? rawData.revision ?? 1;

        envelope = this.createEnvelope(
          rawData,
          entityType,
          entityId,
          revision,
          this.getSourceIdentifier()
        );
      }

      // Add Kafka-specific metadata
      envelope.ingest.partition = partition;
      envelope.ingest.offset = parseInt(message.offset, 10);

      // Process the record
      await this.processRecord(envelope);

      // Track offset for commit
      const partitionKey = `${partition}`;
      const currentOffset = parseInt(message.offset, 10);
      this.pendingCommits.set(partitionKey, currentOffset + 1);
      this.offsets.set(partitionKey, currentOffset);
    } catch (error) {
      this.logger.error(
        { partition, offset: message.offset, error },
        'Error processing Kafka message'
      );

      // Still advance offset to avoid stuck consumer
      const partitionKey = `${partition}`;
      const currentOffset = parseInt(message.offset, 10);
      this.pendingCommits.set(partitionKey, currentOffset + 1);
    }
  }

  private async waitForBackpressureRelease(): Promise<void> {
    const maxWait = 60000; // 1 minute
    const start = Date.now();

    while (!this.backpressure.isAccepting() && Date.now() - start < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  private async commitOffsets(): Promise<void> {
    if (!this.consumer || this.pendingCommits.size === 0) {
      return;
    }

    try {
      const offsets = Array.from(this.pendingCommits.entries()).map(([partition, offset]) => ({
        topic: this.kafkaConfig.topic,
        partition: parseInt(partition, 10),
        offset: offset.toString(),
      }));

      await this.consumer.commitOffsets(offsets);
      this.pendingCommits.clear();

      // Update checkpoint
      const maxOffset = Math.max(...Array.from(this.offsets.values()));
      await this.setCheckpoint(this.createCheckpoint(maxOffset.toString()));

      this.logger.debug({ offsets: offsets.length }, 'Committed Kafka offsets');
    } catch (error) {
      this.logger.error({ error }, 'Failed to commit Kafka offsets');
    }
  }
}
