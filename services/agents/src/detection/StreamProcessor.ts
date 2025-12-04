/**
 * Stream Processor for Anomaly Detection
 *
 * Consumes data streams from Neo4j and pgvector, transforms them into
 * feature vectors, and feeds them to anomaly detectors for real-time
 * OSINT/CTI outlier detection.
 */

import { createClient, RedisClientType } from 'redis';
import {
  StreamDataPoint,
  FeatureVector,
  GraphNode,
  GraphEdge,
  DataSourceType,
} from './types.js';

interface StreamProcessorConfig {
  redisUrl: string;
  neo4jStreamKey: string;
  pgvectorStreamKey: string;
  batchSize: number;
  batchTimeoutMs: number;
  maxBufferSize: number;
}

interface Neo4jStreamMessage {
  nodeId: string;
  nodeType: string;
  operation: 'create' | 'update' | 'delete';
  properties: Record<string, unknown>;
  relationships?: Array<{
    type: string;
    targetId: string;
    properties: Record<string, unknown>;
  }>;
  timestamp: string;
}

interface PgvectorStreamMessage {
  id: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  operation: 'upsert' | 'delete';
  timestamp: string;
}

type StreamCallback = (points: StreamDataPoint[]) => Promise<void>;
type GraphCallback = (nodes: GraphNode[], edges: GraphEdge[]) => Promise<void>;

export class StreamProcessor {
  private redis: RedisClientType | null = null;
  private config: StreamProcessorConfig;
  private isRunning = false;
  private buffer: StreamDataPoint[] = [];
  private graphNodes: Map<string, GraphNode> = new Map();
  private graphEdges: Map<string, GraphEdge> = new Map();
  private streamCallback: StreamCallback | null = null;
  private graphCallback: GraphCallback | null = null;
  private lastProcessTime = Date.now();
  private consumerGroup = 'anomaly-detection';
  private consumerId: string;

  constructor(config: Partial<StreamProcessorConfig> = {}) {
    this.config = {
      redisUrl: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      neo4jStreamKey: config.neo4jStreamKey || 'neo4j:changes',
      pgvectorStreamKey: config.pgvectorStreamKey || 'pgvector:embeddings',
      batchSize: config.batchSize ?? 100,
      batchTimeoutMs: config.batchTimeoutMs ?? 1000,
      maxBufferSize: config.maxBufferSize ?? 10000,
    };

    this.consumerId = `consumer-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Initialize Redis connection and create consumer groups
   */
  async initialize(): Promise<void> {
    this.redis = createClient({ url: this.config.redisUrl });

    this.redis.on('error', (err) => {
      console.error('[StreamProcessor] Redis error:', err);
    });

    await this.redis.connect();

    // Create consumer groups for both streams
    await this.ensureConsumerGroup(this.config.neo4jStreamKey);
    await this.ensureConsumerGroup(this.config.pgvectorStreamKey);

    console.log('[StreamProcessor] Initialized and connected to Redis');
  }

  private async ensureConsumerGroup(streamKey: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.xGroupCreate(streamKey, this.consumerGroup, '0', {
        MKSTREAM: true,
      });
    } catch (err: any) {
      // Group already exists is ok
      if (!err.message?.includes('BUSYGROUP')) {
        console.warn(`[StreamProcessor] Failed to create consumer group for ${streamKey}:`, err.message);
      }
    }
  }

  /**
   * Register callback for processed stream data
   */
  onData(callback: StreamCallback): void {
    this.streamCallback = callback;
  }

  /**
   * Register callback for graph updates (for GraphDiffusionDetector)
   */
  onGraphUpdate(callback: GraphCallback): void {
    this.graphCallback = callback;
  }

  /**
   * Start consuming from streams
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    if (!this.redis) {
      throw new Error('StreamProcessor not initialized. Call initialize() first.');
    }

    this.isRunning = true;
    console.log('[StreamProcessor] Starting stream consumption...');

    // Start parallel consumers
    await Promise.all([
      this.consumeNeo4jStream(),
      this.consumePgvectorStream(),
      this.processBufferLoop(),
    ]);
  }

  /**
   * Stop consuming from streams
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Process remaining buffer
    if (this.buffer.length > 0) {
      await this.flushBuffer();
    }

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }

    console.log('[StreamProcessor] Stopped');
  }

  private async consumeNeo4jStream(): Promise<void> {
    if (!this.redis) return;

    while (this.isRunning) {
      try {
        const messages = await this.redis.xReadGroup(
          this.consumerGroup,
          this.consumerId,
          [{ key: this.config.neo4jStreamKey, id: '>' }],
          { COUNT: this.config.batchSize, BLOCK: 5000 },
        );

        if (!messages) continue;

        for (const stream of messages) {
          for (const message of stream.messages) {
            try {
              const data = this.parseNeo4jMessage(message.message);
              if (data) {
                await this.processNeo4jMessage(data);
                await this.redis!.xAck(
                  this.config.neo4jStreamKey,
                  this.consumerGroup,
                  message.id,
                );
              }
            } catch (err) {
              console.error('[StreamProcessor] Error processing Neo4j message:', err);
            }
          }
        }
      } catch (err) {
        if (this.isRunning) {
          console.error('[StreamProcessor] Neo4j stream error:', err);
          await this.delay(1000);
        }
      }
    }
  }

  private async consumePgvectorStream(): Promise<void> {
    if (!this.redis) return;

    while (this.isRunning) {
      try {
        const messages = await this.redis.xReadGroup(
          this.consumerGroup,
          this.consumerId,
          [{ key: this.config.pgvectorStreamKey, id: '>' }],
          { COUNT: this.config.batchSize, BLOCK: 5000 },
        );

        if (!messages) continue;

        for (const stream of messages) {
          for (const message of stream.messages) {
            try {
              const data = this.parsePgvectorMessage(message.message);
              if (data) {
                await this.processPgvectorMessage(data);
                await this.redis!.xAck(
                  this.config.pgvectorStreamKey,
                  this.consumerGroup,
                  message.id,
                );
              }
            } catch (err) {
              console.error('[StreamProcessor] Error processing pgvector message:', err);
            }
          }
        }
      } catch (err) {
        if (this.isRunning) {
          console.error('[StreamProcessor] pgvector stream error:', err);
          await this.delay(1000);
        }
      }
    }
  }

  private parseNeo4jMessage(message: Record<string, string>): Neo4jStreamMessage | null {
    try {
      const data = message.data ? JSON.parse(message.data) : message;
      return {
        nodeId: data.nodeId || data.id,
        nodeType: data.nodeType || data.type || 'Unknown',
        operation: data.operation || 'update',
        properties: data.properties || {},
        relationships: data.relationships,
        timestamp: data.timestamp || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private parsePgvectorMessage(message: Record<string, string>): PgvectorStreamMessage | null {
    try {
      const data = message.data ? JSON.parse(message.data) : message;
      return {
        id: data.id,
        embedding: data.embedding || [],
        metadata: data.metadata || {},
        operation: data.operation || 'upsert',
        timestamp: data.timestamp || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private async processNeo4jMessage(msg: Neo4jStreamMessage): Promise<void> {
    // Create stream data point
    const point: StreamDataPoint = {
      id: `neo4j:${msg.nodeId}:${Date.now()}`,
      sourceType: 'neo4j',
      timestamp: new Date(msg.timestamp),
      data: {
        neo4j: {
          nodeId: msg.nodeId,
          nodeType: msg.nodeType,
          properties: msg.properties,
          relationships: msg.relationships,
        },
      },
    };

    this.buffer.push(point);

    // Update graph structure for diffusion detector
    if (msg.operation !== 'delete') {
      const node: GraphNode = {
        id: msg.nodeId,
        type: msg.nodeType,
        properties: msg.properties,
        degree: (msg.relationships || []).length,
        clusteringCoefficient: 0, // Will be computed by detector
      };
      this.graphNodes.set(msg.nodeId, node);

      // Add edges
      for (const rel of msg.relationships || []) {
        const edgeId = `${msg.nodeId}-${rel.type}-${rel.targetId}`;
        const edge: GraphEdge = {
          id: edgeId,
          sourceId: msg.nodeId,
          targetId: rel.targetId,
          type: rel.type,
          weight: (rel.properties.weight as number) || 1.0,
          properties: rel.properties,
        };
        this.graphEdges.set(edgeId, edge);
      }
    }

    // Trigger buffer flush if needed
    if (this.buffer.length >= this.config.batchSize) {
      await this.flushBuffer();
    }
  }

  private async processPgvectorMessage(msg: PgvectorStreamMessage): Promise<void> {
    if (msg.operation === 'delete') return;

    const point: StreamDataPoint = {
      id: `pgvector:${msg.id}:${Date.now()}`,
      sourceType: 'pgvector',
      timestamp: new Date(msg.timestamp),
      data: {
        pgvector: {
          id: msg.id,
          embedding: msg.embedding,
          metadata: msg.metadata,
        },
      },
    };

    this.buffer.push(point);

    if (this.buffer.length >= this.config.batchSize) {
      await this.flushBuffer();
    }
  }

  private async processBufferLoop(): Promise<void> {
    while (this.isRunning) {
      const elapsed = Date.now() - this.lastProcessTime;

      if (this.buffer.length > 0 && elapsed >= this.config.batchTimeoutMs) {
        await this.flushBuffer();
      }

      await this.delay(100);
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.config.batchSize);
    this.lastProcessTime = Date.now();

    // Invoke stream callback
    if (this.streamCallback) {
      try {
        await this.streamCallback(batch);
      } catch (err) {
        console.error('[StreamProcessor] Error in stream callback:', err);
      }
    }

    // Check if we need to update graph detector
    if (this.graphCallback && this.graphNodes.size > 0) {
      const nodes = Array.from(this.graphNodes.values());
      const edges = Array.from(this.graphEdges.values());

      try {
        await this.graphCallback(nodes, edges);
        // Clear graph buffers after successful callback
        this.graphNodes.clear();
        this.graphEdges.clear();
      } catch (err) {
        console.error('[StreamProcessor] Error in graph callback:', err);
      }
    }
  }

  /**
   * Convert stream data points to feature vectors for Isolation Forest
   */
  static toFeatureVectors(points: StreamDataPoint[]): FeatureVector[] {
    return points.map((point) => {
      let features: number[] = [];
      const metadata: Record<string, unknown> = {};

      if (point.data.neo4j) {
        const neo4j = point.data.neo4j;
        metadata.nodeId = neo4j.nodeId;
        metadata.nodeType = neo4j.nodeType;

        // Extract numeric features from properties
        for (const [key, value] of Object.entries(neo4j.properties)) {
          if (typeof value === 'number') {
            features.push(value);
            metadata[`prop_${key}`] = value;
          } else if (typeof value === 'boolean') {
            features.push(value ? 1 : 0);
          } else if (typeof value === 'string') {
            // Hash string to numeric feature
            features.push(StreamProcessor.hashString(value) % 10000);
          }
        }

        // Add structural features
        features.push((neo4j.relationships || []).length); // Degree
        features.push(point.timestamp.getTime() % 86400000); // Time of day

        // Ensure minimum feature count
        while (features.length < 10) {
          features.push(0);
        }
      }

      if (point.data.pgvector) {
        const pgvector = point.data.pgvector;
        metadata.vectorId = pgvector.id;
        metadata.vectorMetadata = pgvector.metadata;

        // Use embedding directly as features
        features = pgvector.embedding.slice(0, 64); // Cap at 64 dimensions

        // Add temporal feature
        features.push(point.timestamp.getTime() % 86400000);
      }

      return {
        id: point.id,
        sourceId:
          point.data.neo4j?.nodeId ||
          point.data.pgvector?.id ||
          point.id,
        sourceType: point.sourceType,
        features,
        metadata,
        timestamp: point.timestamp,
      };
    });
  }

  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Manually push data for testing or direct integration
   */
  async pushData(points: StreamDataPoint[]): Promise<void> {
    this.buffer.push(...points);

    if (this.buffer.length >= this.config.batchSize) {
      await this.flushBuffer();
    }
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Check if processor is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
