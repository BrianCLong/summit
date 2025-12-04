
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../../db/redis';
import { getNeo4jDriver } from '../../db/neo4j';
import { telemetry } from '../telemetry/comprehensive-telemetry';
import neo4j from 'neo4j-driver';
import { CompressionUtils } from '../../utils/compression';
import { logger } from '../../config/logger';

export interface StreamConfig {
  batchSize?: number;
  format?: 'json' | 'csv' | 'msgpack';
  compress?: boolean;
}

export class GraphStreamer extends EventEmitter {
  private readonly defaultBatchSize = 1000;
  private activeStreams: Map<string, boolean> = new Map();

  constructor() {
    super();
  }

  async startStream(
    query: string,
    params: any,
    config: StreamConfig = {}
  ): Promise<string> {
    const streamId = uuidv4();
    this.activeStreams.set(streamId, true);

    // Store query info for later execution in Redis
    const redis = getRedisClient();
    await redis.set(`stream_pending:${streamId}`, JSON.stringify({ query, params, config }), 'EX', 300);

    return streamId;
  }

  async executeStream(streamId: string) {
      const redis = getRedisClient();
      const pendingData = await redis.get(`stream_pending:${streamId}`);

      if (!pendingData) return;

      await redis.del(`stream_pending:${streamId}`);
      const { query, params, config } = JSON.parse(pendingData);
      const batchSize = config.batchSize || this.defaultBatchSize;

      // Use _skipCache to bypass optimization/buffering
      const streamParams = { ...params, _skipCache: true };

      await this.processStream(streamId, query, streamParams, batchSize, config).catch(err => {
        logger.error(`Stream ${streamId} failed:`, err);
        this.emit(`error:${streamId}`, err);
      });
  }

  private streamSessions = new Map<string, any>();

  private async processStream(
    streamId: string,
    query: string,
    params: any,
    batchSize: number,
    config: StreamConfig
  ) {
    const driver = getNeo4jDriver();
    const session = driver.session();
    const redis = getRedisClient();

    this.streamSessions.set(streamId, session);

    try {
      const result = session.run(query, params);

      let batch: any[] = [];
      let count = 0;

      result.subscribe({
        onNext: (record) => {
          if (!this.activeStreams.get(streamId)) {
            return;
          }

          batch.push(record.toObject());
          count++;

          if (batch.length >= batchSize) {
            this.emitBatch(redis, streamId, batch, config);
            batch = [];
          }
        },
        onCompleted: () => {
          if (batch.length > 0) {
            this.emitBatch(redis, streamId, batch, config);
          }
          this.emitComplete(redis, streamId, count);
          this.cleanup(streamId);
        },
        onError: (error) => {
          this.emitError(redis, streamId, error);
          this.cleanup(streamId);
        }
      });

    } catch (error) {
      this.emitError(redis, streamId, error);
      this.cleanup(streamId);
    }
  }

  private async emitBatch(redis: any, streamId: string, batch: any[], config: StreamConfig) {
    const channel = `stream:${streamId}`;

    // Normalize data (Neo4j Integers -> JS numbers)
    const normalizedBatch = this.transformNeo4jIntegers(batch);

    let payload: any = { type: 'batch', data: normalizedBatch };

    // Handle compression
    if (config.compress) {
        try {
            const compressedData = await CompressionUtils.compressToString(normalizedBatch);
            payload = { type: 'batch', data: compressedData, compressed: true };
        } catch (e) {
            logger.error('Streaming compression failed', e);
            // Fallback to uncompressed
        }
    }

    const data = JSON.stringify(payload);
    redis.publish(channel, data).catch((err: any) => logger.error('Redis publish error', err));
    this.emit(`data:${streamId}`, normalizedBatch);
  }

  private emitComplete(redis: any, streamId: string, totalRecords: number) {
    const channel = `stream:${streamId}`;
    const data = JSON.stringify({ type: 'complete', totalRecords });
    redis.publish(channel, data).catch((err: any) => logger.error('Redis publish error', err));
    this.emit(`complete:${streamId}`, { totalRecords });
  }

  private emitError(redis: any, streamId: string, error: any) {
    const channel = `stream:${streamId}`;
    const data = JSON.stringify({ type: 'error', message: error.message });
    redis.publish(channel, data).catch((err: any) => logger.error('Redis publish error', err));
    this.emit(`error:${streamId}`, error);
  }

  stopStream(streamId: string) {
    this.activeStreams.set(streamId, false);
    this.cleanup(streamId);
  }

  private cleanup(streamId: string) {
    this.activeStreams.delete(streamId);
    const session = this.streamSessions.get(streamId);
    if (session) {
        session.close().catch(() => {});
        this.streamSessions.delete(streamId);
    }
  }

  // Helper to convert Neo4j Integers to standard JS numbers/strings
  // Duplicated from QueryOptimizer for independence
  private transformNeo4jIntegers(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (neo4j.isInt(obj)) {
      return obj.inSafeRange() ? obj.toNumber() : obj.toString();
    }

    if (Array.isArray(obj)) {
      return obj.map(v => this.transformNeo4jIntegers(v));
    }

    if (typeof obj === 'object') {
      const newObj: any = {};
      for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          newObj[k] = this.transformNeo4jIntegers(obj[k]);
        }
      }
      return newObj;
    }

    return obj;
  }
}

export const graphStreamer = new GraphStreamer();
