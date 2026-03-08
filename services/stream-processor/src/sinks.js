"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiSink = exports.WebhookSink = exports.RedisSink = exports.PostgreSQLSink = void 0;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'stream-sinks' });
/**
 * PostgreSQL sink
 */
class PostgreSQLSink {
    pool;
    constructor(connectionString) {
        this.pool = new pg_1.Pool({ connectionString });
    }
    async write(messages) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            for (const message of messages) {
                await client.query(`INSERT INTO stream_events (event_id, event_type, payload, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (event_id) DO NOTHING`, [
                    message.metadata.eventId,
                    message.metadata.eventType,
                    JSON.stringify(message.payload),
                    new Date(message.metadata.timestamp),
                    JSON.stringify(message.metadata),
                ]);
            }
            await client.query('COMMIT');
            logger.debug({ count: messages.length }, 'Wrote to PostgreSQL');
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger.error({ error }, 'PostgreSQL write failed');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async close() {
        await this.pool.end();
    }
}
exports.PostgreSQLSink = PostgreSQLSink;
/**
 * Redis sink
 */
class RedisSink {
    redis;
    constructor(url) {
        this.redis = new ioredis_1.default(url);
    }
    async write(messages) {
        const pipeline = this.redis.pipeline();
        for (const message of messages) {
            const key = `event:${message.metadata.eventId}`;
            pipeline.setex(key, 86400, JSON.stringify(message)); // 24 hour TTL
            // Add to stream
            pipeline.xadd(`stream:${message.metadata.eventType}`, '*', 'data', JSON.stringify(message));
        }
        await pipeline.exec();
        logger.debug({ count: messages.length }, 'Wrote to Redis');
    }
    async close() {
        await this.redis.quit();
    }
}
exports.RedisSink = RedisSink;
/**
 * Webhook sink
 */
class WebhookSink {
    url;
    headers;
    constructor(url, headers) {
        this.url = url;
        this.headers = headers;
    }
    async write(messages) {
        try {
            const response = await fetch(this.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.headers,
                },
                body: JSON.stringify({ events: messages }),
            });
            if (!response.ok) {
                throw new Error(`Webhook failed: ${response.status}`);
            }
            logger.debug({ count: messages.length }, 'Sent to webhook');
        }
        catch (error) {
            logger.error({ error, url: this.url }, 'Webhook write failed');
            throw error;
        }
    }
    async close() {
        // Nothing to close
    }
}
exports.WebhookSink = WebhookSink;
/**
 * Multi-sink for fanout
 */
class MultiSink {
    sinks;
    constructor(sinks) {
        this.sinks = sinks;
    }
    async write(messages) {
        await Promise.all(this.sinks.map((sink) => sink.write(messages)));
    }
    async close() {
        await Promise.all(this.sinks.map((sink) => sink.close()));
    }
}
exports.MultiSink = MultiSink;
