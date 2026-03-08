"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphStreamer = exports.GraphStreamer = void 0;
// @ts-nocheck
const events_1 = require("events");
const uuid_1 = require("uuid");
const redis_js_1 = require("../../db/redis.js");
const neo4j_js_1 = require("../../db/neo4j.js");
const prom_client_1 = require("prom-client");
const compression_js_1 = require("../../utils/compression.js");
const logger_js_1 = require("../../config/logger.js");
class GraphStreamer extends events_1.EventEmitter {
    defaultBatchSize = 1000;
    streamTimeoutMs = 300000; // 5 minutes
    activeStreams = new Map();
    streamTimers = new Map();
    // Metrics
    activeStreamsGauge = new prom_client_1.Gauge({
        name: 'graph_active_streams',
        help: 'Number of active graph streams',
    });
    streamedRecordsCounter = new prom_client_1.Counter({
        name: 'graph_streamed_records_total',
        help: 'Total number of records streamed',
    });
    constructor() {
        super();
    }
    async startStream(query, params, config = {}) {
        const streamId = (0, uuid_1.v4)();
        this.activeStreams.set(streamId, true);
        this.activeStreamsGauge.inc();
        // Set a safety timeout to clean up stuck streams
        const timer = setTimeout(() => {
            logger_js_1.logger.warn(`Stream ${streamId} timed out, forcing cleanup`);
            this.stopStream(streamId);
        }, this.streamTimeoutMs);
        this.streamTimers.set(streamId, timer);
        // Store query info for later execution in Redis
        const redis = (0, redis_js_1.getRedisClient)();
        await redis.set(`stream_pending:${streamId}`, JSON.stringify({ query, params, config }), 'EX', 300);
        return streamId;
    }
    async executeStream(streamId) {
        const redis = (0, redis_js_1.getRedisClient)();
        const pendingData = await redis.get(`stream_pending:${streamId}`);
        if (!pendingData)
            return;
        await redis.del(`stream_pending:${streamId}`);
        const { query, params, config } = JSON.parse(pendingData);
        const batchSize = config.batchSize || this.defaultBatchSize;
        // Use _skipCache to bypass optimization/buffering
        const streamParams = { ...params, _skipCache: true };
        try {
            await this.processStream(streamId, query, streamParams, batchSize, config);
        }
        catch (err) {
            logger_js_1.logger.error(`Stream ${streamId} failed:`, err);
            this.emit(`error:${streamId}`, err);
            // Ensure cleanup happens even if processStream throws synchronously
            this.cleanup(streamId);
        }
    }
    streamSessions = new Map();
    async processStream(streamId, query, params, batchSize, config) {
        const driver = (0, neo4j_js_1.getNeo4jDriver)();
        const session = driver.session();
        const redis = (0, redis_js_1.getRedisClient)();
        this.streamSessions.set(streamId, session);
        try {
            const result = session.run(query, params);
            let batch = [];
            let count = 0;
            // Wrap subscription in a promise to allow awaiting
            await new Promise((resolve, reject) => {
                result.subscribe({
                    onNext: (record) => {
                        if (!this.activeStreams.get(streamId)) {
                            // If stream is stopped, we should unsubscribe or just ignore
                            return;
                        }
                        batch.push(record.toObject());
                        count++;
                        this.streamedRecordsCounter.inc();
                        if (batch.length >= batchSize) {
                            this.emitBatch(redis, streamId, batch, config).catch((err) => {
                                // If emitting fails (e.g. Redis down), stop the stream
                                logger_js_1.logger.error(`Failed to emit batch for stream ${streamId}`, err);
                                this.stopStream(streamId);
                                reject(err);
                            });
                            batch = [];
                        }
                    },
                    onCompleted: () => {
                        if (batch.length > 0) {
                            this.emitBatch(redis, streamId, batch, config).catch((err) => logger_js_1.logger.error(`Failed to emit final batch for stream ${streamId}`, err));
                        }
                        this.emitComplete(redis, streamId, count);
                        resolve();
                    },
                    onError: (error) => {
                        this.emitError(redis, streamId, error);
                        reject(error);
                    },
                });
            });
        }
        catch (error) {
            // Re-throw to be caught by executeStream for logging, but we handled emitError in subscribe
            throw error;
        }
        finally {
            this.cleanup(streamId);
        }
    }
    async emitBatch(redis, streamId, batch, config) {
        const channel = `stream:${streamId}`;
        // Normalize data (Neo4j Integers -> JS numbers)
        const normalizedBatch = (0, neo4j_js_1.transformNeo4jIntegers)(batch);
        let payload = { type: 'batch', data: normalizedBatch };
        // Handle compression
        if (config.compress) {
            try {
                const compressedData = await compression_js_1.CompressionUtils.compressToString(normalizedBatch);
                payload = { type: 'batch', data: compressedData, compressed: true };
            }
            catch (e) {
                logger_js_1.logger.error('Streaming compression failed', e);
                // Fallback to uncompressed
            }
        }
        const data = JSON.stringify(payload);
        // Propagate error if publish fails
        await redis.publish(channel, data);
        this.emit(`data:${streamId}`, normalizedBatch);
    }
    emitComplete(redis, streamId, totalRecords) {
        const channel = `stream:${streamId}`;
        const data = JSON.stringify({ type: 'complete', totalRecords });
        redis
            .publish(channel, data)
            .catch((err) => logger_js_1.logger.error('Redis publish error', err));
        this.emit(`complete:${streamId}`, { totalRecords });
    }
    emitError(redis, streamId, error) {
        const channel = `stream:${streamId}`;
        const data = JSON.stringify({ type: 'error', message: error.message });
        redis
            .publish(channel, data)
            .catch((err) => logger_js_1.logger.error('Redis publish error', err));
        this.emit(`error:${streamId}`, error);
    }
    stopStream(streamId) {
        this.activeStreams.set(streamId, false);
        this.cleanup(streamId);
    }
    cleanup(streamId) {
        // Clear timeout if exists
        if (this.streamTimers.has(streamId)) {
            clearTimeout(this.streamTimers.get(streamId));
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
}
exports.GraphStreamer = GraphStreamer;
exports.graphStreamer = new GraphStreamer();
