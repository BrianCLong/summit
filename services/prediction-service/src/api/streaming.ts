/**
 * Real-time Streaming Predictions
 */

import { EventEmitter } from 'events';
import type { PredictionEngine } from '../core/prediction-engine.js';
import type { PredictionRequest, PredictionResponse } from '../types/index.js';

export interface StreamConfig {
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
}

export interface StreamingPrediction extends PredictionResponse {
  streamId: string;
  sequenceNumber: number;
}

/**
 * Streaming Prediction Handler
 */
export class StreamingPredictionHandler extends EventEmitter {
  private engine: PredictionEngine;
  private config: StreamConfig;
  private queue: Map<string, PredictionRequest[]> = new Map();
  private sequenceNumbers: Map<string, number> = new Map();
  private flushTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(engine: PredictionEngine, config: Partial<StreamConfig> = {}) {
    super();
    this.engine = engine;
    this.config = {
      batchSize: config.batchSize || 50,
      flushIntervalMs: config.flushIntervalMs || 100,
      maxQueueSize: config.maxQueueSize || 1000,
    };
  }

  /**
   * Create a new prediction stream
   */
  createStream(streamId: string): void {
    if (this.queue.has(streamId)) {
      throw new Error(`Stream ${streamId} already exists`);
    }

    this.queue.set(streamId, []);
    this.sequenceNumbers.set(streamId, 0);

    // Set up periodic flush
    const timer = setInterval(() => {
      this.flush(streamId);
    }, this.config.flushIntervalMs);

    this.flushTimers.set(streamId, timer);
    this.emit('streamCreated', { streamId });
  }

  /**
   * Close a prediction stream
   */
  closeStream(streamId: string): void {
    // Flush remaining items
    this.flush(streamId);

    // Clean up
    this.queue.delete(streamId);
    this.sequenceNumbers.delete(streamId);

    const timer = this.flushTimers.get(streamId);
    if (timer) {
      clearInterval(timer);
      this.flushTimers.delete(streamId);
    }

    this.emit('streamClosed', { streamId });
  }

  /**
   * Add prediction request to stream
   */
  async addToStream(streamId: string, request: PredictionRequest): Promise<void> {
    const queue = this.queue.get(streamId);

    if (!queue) {
      throw new Error(`Stream ${streamId} not found`);
    }

    if (queue.length >= this.config.maxQueueSize) {
      throw new Error(`Stream ${streamId} queue full`);
    }

    queue.push(request);

    // Flush if batch size reached
    if (queue.length >= this.config.batchSize) {
      await this.flush(streamId);
    }
  }

  /**
   * Flush pending predictions
   */
  private async flush(streamId: string): Promise<void> {
    const queue = this.queue.get(streamId);

    if (!queue || queue.length === 0) {
      return;
    }

    const requests = queue.splice(0, this.config.batchSize);

    try {
      const predictions = await Promise.all(
        requests.map(async (request) => {
          const response = await this.engine.predict(request);
          const seqNum = (this.sequenceNumbers.get(streamId) || 0) + 1;
          this.sequenceNumbers.set(streamId, seqNum);

          const streamingPrediction: StreamingPrediction = {
            ...response,
            streamId,
            sequenceNumber: seqNum,
          };

          return streamingPrediction;
        })
      );

      this.emit('predictions', { streamId, predictions });
    } catch (error) {
      this.emit('error', { streamId, error });
    }
  }

  /**
   * Get stream statistics
   */
  getStreamStats(streamId: string): {
    queueSize: number;
    sequenceNumber: number;
    active: boolean;
  } {
    return {
      queueSize: this.queue.get(streamId)?.length || 0,
      sequenceNumber: this.sequenceNumbers.get(streamId) || 0,
      active: this.queue.has(streamId),
    };
  }
}

/**
 * Server-Sent Events (SSE) handler for streaming predictions
 */
export function createSSEHandler(streamHandler: StreamingPredictionHandler) {
  return (req: any, res: any) => {
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Stream-Id', streamId);

    // Create stream
    streamHandler.createStream(streamId);

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ streamId })}\n\n`);

    // Handle predictions
    const onPredictions = ({ streamId: sid, predictions }: any) => {
      if (sid === streamId) {
        for (const prediction of predictions) {
          res.write(`event: prediction\ndata: ${JSON.stringify(prediction)}\n\n`);
        }
      }
    };

    // Handle errors
    const onError = ({ streamId: sid, error }: any) => {
      if (sid === streamId) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      }
    };

    streamHandler.on('predictions', onPredictions);
    streamHandler.on('error', onError);

    // Clean up on client disconnect
    req.on('close', () => {
      streamHandler.off('predictions', onPredictions);
      streamHandler.off('error', onError);
      streamHandler.closeStream(streamId);
    });

    return streamId;
  };
}
