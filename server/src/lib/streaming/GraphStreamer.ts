// @ts-nocheck
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../../db/redis.js';
import { getNeo4jDriver } from '../../db/neo4j.js';
import { Gauge, Counter } from 'prom-client';
import neo4j from 'neo4j-driver';
import { CompressionUtils } from '../../utils/compression.js';
import { logger } from '../../config/logger.js';

export interface StreamConfig {
  batchSize?: number;
  format?: 'json' | 'csv' | 'msgpack';
  compress?: boolean;
}

export class GraphStreamer extends EventEmitter {
  private readonly defaultBatchSize = 1000;
  private readonly streamTimeoutMs = 300000; // 5 minutes
  private activeStreams: Map<string, boolean> = new Map();
  private streamTimers: Map<string, NodeJS.Timeout> = new Map();

  // Metrics
  private activeStreamsGauge = new Gauge({
    name: 'graph_active_streams',
    help: 'Number of active graph streams',
  });
  private streamedRecordsCounter = new Counter({
    name: 'graph_streamed_records_total',
    help: 'Total number of records streamed',
  });

  constructor() {
    super();
  }

  async startStream(
    query: string,
    params: Record<string, unknown>,
    config: StreamConfig = {},
  ): Promise<string> {
    const streamId = uuidv4();
    this.activeStreams.set(streamId, true);
    this.activeStreamsGauge.inc();

    // Set a safety timeout to clean up stuck streams
    const timer = setTimeout(() => {
      logger.warn(`Stream ${streamId} timed out, forcing cleanup`);
      this.stopStream(streamId);
    }, this.streamTimeoutMs);
    this.streamTimers.set(streamId, timer);

    // Store query info for later execution in Redis
    const redis = getRedisClient();
    await redis.set(
      `stream_pending:${streamId}`,
      JSON.stringify({ query, params, config }),
      'EX',
      300,
    );

    return streamId;
  }

  async executeStream(streamId: string) {
    const redis = getRedisClient();
    const pendingData = await redis.get(`stream_pending:${streamId}`);

    if (!pendingData) return;

    await redis.del(`stream_pending:${streamId}`);
    const { query, params, config } = JSON.parse(pendingData) as {
      query: string;
      params: Record<string, unknown>;
      config: StreamConfig;
    };
    const batchSize = config.batchSize || this.defaultBatchSize;

    // Use _skipCache to bypass optimization/buffering
    const streamParams = { ...params, _skipCache: true };

    try {
      await this.processStream(streamId, query, streamParams, batchSize, config);
    } catch (err: any) {
      logger.error(`Stream ${streamId} failed:`, err);
      this.emit(`error:${streamId}`, err);
      // Ensure cleanup happens even if processStream throws synchronously
      this.cleanup(streamId);
    }
  }

  private streamSessions = new Map<string, neo4j.Session>();

  private async processStream(
    streamId: string,
    query: string,
    params: Record<string, unknown>,
    batchSize: number,
    config: StreamConfig,
  ) {
    const driver = getNeo4jDriver();
    const session = driver.session();
    const redis = getRedisClient();

    this.streamSessions.set(streamId, session);

    try {
      const result = session.run(query, params);

      let batch: neo4j.Record[] = [];
      let count = 0;

      // Wrap subscription in a promise to allow awaiting
      await new Promise<void>((resolve, reject) => {
        result.subscribe({
          onNext: (record: neo4j.Record) => {
            if (!this.activeStreams.get(streamId)) {
              // If stream is stopped, we should unsubscribe or just ignore
              return;
            }

            batch.push(record.toObject());
            count++;
            this.streamedRecordsCounter.inc();

            if (batch.length >= batchSize) {
              this.emitBatch(redis, streamId, batch, config).catch((err: any) => {
                // If emitting fails (e.g. Redis down), stop the stream
                logger.error(
                  `Failed to emit batch for stream ${streamId}`,
                  err,
                );
                this.stopStream(streamId);
                reject(err);
              });
              batch = [];
            }
          },
          onCompleted: () => {
            if (batch.length > 0) {
              this.emitBatch(redis, streamId, batch, config).catch((err: any) =>
                logger.error(
                  `Failed to emit final batch for stream ${streamId}`,
                  err,
                ),
              );
            }
            this.emitComplete(redis, streamId, count);
            resolve();
          },
          onError: (error: Error) => {
            this.emitError(redis, streamId, error);
            reject(error);
          },
        });
      });
    } catch (error: any) {
      // Re-throw to be caught by executeStream for logging, but we handled emitError in subscribe
      throw error;
    } finally {
      this.cleanup(streamId);
    }
  }

  private async emitBatch(
    redis: ReturnType<typeof getRedisClient>,
    streamId: string,
    batch: neo4j.Record[],
    config: StreamConfig,
  ) {
    const channel = `stream:${streamId}`;

    // Normalize data (Neo4j Integers -> JS numbers)
    const normalizedBatch = this.transformNeo4jIntegers(batch);

    let payload: {
      type: string;
      data: unknown;
      compressed?: boolean;
    } = { type: 'batch', data: normalizedBatch };

    // Handle compression
    if (config.compress) {
      try {
        const compressedData =
          await CompressionUtils.compressToString(normalizedBatch);
        payload = { type: 'batch', data: compressedData, compressed: true };
      } catch (e: any) {
        logger.error('Streaming compression failed', e);
        // Fallback to uncompressed
      }
    }

    const data = JSON.stringify(payload);
    // Propagate error if publish fails
    await redis.publish(channel, data);
    this.emit(`data:${streamId}`, normalizedBatch);
  }

  private emitComplete(
    redis: ReturnType<typeof getRedisClient>,
    streamId: string,
    totalRecords: number,
  ) {
    const channel = `stream:${streamId}`;
    const data = JSON.stringify({ type: 'complete', totalRecords });
    redis
      .publish(channel, data)
      .catch((err: unknown) => logger.error('Redis publish error', err));
    this.emit(`complete:${streamId}`, { totalRecords });
  }

  private emitError(
    redis: ReturnType<typeof getRedisClient>,
    streamId: string,
    error: Error,
  ) {
    const channel = `stream:${streamId}`;
    const data = JSON.stringify({ type: 'error', message: error.message });
    redis
      .publish(channel, data)
      .catch((err: unknown) => logger.error('Redis publish error', err));
    this.emit(`error:${streamId}`, error);
  }

  stopStream(streamId: string) {
    this.activeStreams.set(streamId, false);
    this.cleanup(streamId);
  }

  private cleanup(streamId: string) {
    // Clear timeout if exists
    if (this.streamTimers.has(streamId)) {
      clearTimeout(this.streamTimers.get(streamId)!);
      this.streamTimers.delete(streamId);
    }

    if (this.activeStreams.has(streamId)) {
      this.activeStreamsGauge.dec();
      this.activeStreams.delete(streamId);
    }

    const session = this.streamSessions.get(streamId);
    if (session) {
      session.close().catch(() => { });
      this.streamSessions.delete(streamId);
    }
  }

  // Helper to convert Neo4j Integers to standard JS numbers/strings
  // Duplicated from QueryOptimizer for independence
  private transformNeo4jIntegers(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;

    if (neo4j.isInt(obj)) {
      return obj.inSafeRange() ? obj.toNumber() : obj.toString();
    }

    if (Array.isArray(obj)) {
      return obj.map((v) => this.transformNeo4jIntegers(v));
    }

    if (typeof obj === 'object') {
      const newObj: Record<string, unknown> = {};
      for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          newObj[k] = this.transformNeo4jIntegers(
            (obj as Record<string, unknown>)[k],
          );
        }
      }
      return newObj;
    }

    return obj;
  }
}

export const graphStreamer = new GraphStreamer();
