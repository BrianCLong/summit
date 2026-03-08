"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dlqFactory = exports.PostgresDLQ = void 0;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
const pino_1 = __importDefault(require("pino"));
const database_js_1 = require("../../config/database.js");
const logger = pino_1.default();
/**
 * PostgreSQL-backed Dead Letter Queue.
 * Suitable for distributed environments.
 */
class PostgresDLQ extends events_1.EventEmitter {
    queueName;
    constructor(queueName) {
        super();
        this.queueName = queueName;
    }
    async enqueue(message) {
        const id = message.id || crypto_1.default.randomUUID();
        const pool = (0, database_js_1.getPostgresPool)();
        const query = `
      INSERT INTO dlq_messages (id, queue_name, payload, error, retry_count, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;
        const values = [
            id,
            this.queueName,
            JSON.stringify(message.payload),
            message.error,
            message.retryCount,
            JSON.stringify(message.metadata || {}),
        ];
        try {
            await pool.query(query, values);
            this.emit('enqueued', { id, ...message });
            return id;
        }
        catch (error) {
            logger.error({ err: error, queue: this.queueName }, 'Failed to enqueue DLQ message');
            throw error;
        }
    }
    async dequeue(count = 1) {
        const pool = (0, database_js_1.getPostgresPool)();
        // Simple FIFO fetch.
        // In a real high-concurrency scenario, we might use FOR UPDATE SKIP LOCKED.
        // For now, we just read.
        // Note: This does not "lock" the message, so multiple workers could see it.
        // A robust implementation would mark it as "processing" or delete on ack.
        const query = `
      SELECT id, payload, error, retry_count, metadata, created_at
      FROM dlq_messages
      WHERE queue_name = $1
      ORDER BY created_at ASC
      LIMIT $2
    `;
        try {
            const result = await pool.query(query, [this.queueName, count]);
            return result.rows.map((row) => ({
                id: row.id,
                payload: row.payload, // pg auto-parses json
                error: row.error,
                retryCount: row.retry_count,
                metadata: row.metadata,
                timestamp: new Date(row.created_at).getTime(),
            }));
        }
        catch (error) {
            logger.error({ err: error, queue: this.queueName }, 'Failed to dequeue DLQ messages');
            throw error;
        }
    }
    async ack(messageId) {
        const pool = (0, database_js_1.getPostgresPool)();
        // ACK means "processed successfully" or "discarded", so we remove it.
        try {
            await pool.query('DELETE FROM dlq_messages WHERE id = $1', [messageId]);
            this.emit('acked', messageId);
        }
        catch (error) {
            logger.error({ err: error, messageId }, 'Failed to ack DLQ message');
            throw error;
        }
    }
    async nack(messageId) {
        // NACK might increment retry count?
        const pool = (0, database_js_1.getPostgresPool)();
        try {
            await pool.query('UPDATE dlq_messages SET retry_count = retry_count + 1 WHERE id = $1', [messageId]);
            this.emit('nacked', messageId);
        }
        catch (error) {
            logger.error({ err: error, messageId }, 'Failed to nack DLQ message');
            throw error;
        }
    }
    async count() {
        const pool = (0, database_js_1.getPostgresPool)();
        try {
            const result = await pool.query('SELECT COUNT(*) as count FROM dlq_messages WHERE queue_name = $1', [this.queueName]);
            return parseInt(result.rows[0].count, 10);
        }
        catch (error) {
            return 0;
        }
    }
}
exports.PostgresDLQ = PostgresDLQ;
const dlqFactory = (queueName) => {
    return new PostgresDLQ(queueName);
};
exports.dlqFactory = dlqFactory;
