"use strict";
/**
 * Real-time Streaming Predictions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingPredictionHandler = void 0;
exports.createSSEHandler = createSSEHandler;
const events_1 = require("events");
/**
 * Streaming Prediction Handler
 */
class StreamingPredictionHandler extends events_1.EventEmitter {
    engine;
    config;
    queue = new Map();
    sequenceNumbers = new Map();
    flushTimers = new Map();
    constructor(engine, config = {}) {
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
    createStream(streamId) {
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
    closeStream(streamId) {
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
    async addToStream(streamId, request) {
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
    async flush(streamId) {
        const queue = this.queue.get(streamId);
        if (!queue || queue.length === 0) {
            return;
        }
        const requests = queue.splice(0, this.config.batchSize);
        try {
            const predictions = await Promise.all(requests.map(async (request) => {
                const response = await this.engine.predict(request);
                const seqNum = (this.sequenceNumbers.get(streamId) || 0) + 1;
                this.sequenceNumbers.set(streamId, seqNum);
                const streamingPrediction = {
                    ...response,
                    streamId,
                    sequenceNumber: seqNum,
                };
                return streamingPrediction;
            }));
            this.emit('predictions', { streamId, predictions });
        }
        catch (error) {
            this.emit('error', { streamId, error });
        }
    }
    /**
     * Get stream statistics
     */
    getStreamStats(streamId) {
        return {
            queueSize: this.queue.get(streamId)?.length || 0,
            sequenceNumber: this.sequenceNumbers.get(streamId) || 0,
            active: this.queue.has(streamId),
        };
    }
}
exports.StreamingPredictionHandler = StreamingPredictionHandler;
/**
 * Server-Sent Events (SSE) handler for streaming predictions
 */
function createSSEHandler(streamHandler) {
    return (req, res) => {
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
        const onPredictions = ({ streamId: sid, predictions }) => {
            if (sid === streamId) {
                for (const prediction of predictions) {
                    res.write(`event: prediction\ndata: ${JSON.stringify(prediction)}\n\n`);
                }
            }
        };
        // Handle errors
        const onError = ({ streamId: sid, error }) => {
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
