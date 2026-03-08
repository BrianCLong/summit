"use strict";
/**
 * DeliveryManager - Message delivery guarantees and tracking
 *
 * Implements at-least-once, at-most-once, and exactly-once delivery semantics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryManager = void 0;
const events_1 = require("events");
const types_js_1 = require("../core/types.js");
class DeliveryManager extends events_1.EventEmitter {
    redis;
    deliveryRecords = new Map();
    inFlightMessages = new Set();
    constructor(redis) {
        super();
        this.redis = redis;
    }
    /**
     * Start tracking message delivery
     */
    async startDelivery(message, guarantee) {
        const messageId = message.metadata.messageId;
        // For exactly-once, check if already delivered
        if (guarantee === types_js_1.DeliveryGuarantee.EXACTLY_ONCE) {
            const delivered = await this.isDelivered(messageId);
            if (delivered) {
                throw new Error(`Message ${messageId} already delivered`);
            }
        }
        const record = {
            messageId,
            status: types_js_1.MessageStatus.PENDING,
            attempts: 1,
            firstAttemptedAt: new Date()
        };
        this.deliveryRecords.set(messageId, record);
        this.inFlightMessages.add(messageId);
        // Store in Redis for persistence
        await this.redis.hset('delivery:records', messageId, JSON.stringify(record));
        this.emit('delivery:started', { messageId });
    }
    /**
     * Mark message as processing
     */
    async markProcessing(messageId) {
        const record = this.deliveryRecords.get(messageId);
        if (!record) {
            throw new Error(`No delivery record for message ${messageId}`);
        }
        record.status = types_js_1.MessageStatus.PROCESSING;
        record.lastAttemptedAt = new Date();
        await this.redis.hset('delivery:records', messageId, JSON.stringify(record));
        this.emit('delivery:processing', { messageId });
    }
    /**
     * Complete message delivery
     */
    async complete(messageId) {
        const record = this.deliveryRecords.get(messageId);
        if (!record) {
            throw new Error(`No delivery record for message ${messageId}`);
        }
        record.status = types_js_1.MessageStatus.COMPLETED;
        record.completedAt = new Date();
        await this.redis.hset('delivery:records', messageId, JSON.stringify(record));
        // Mark as delivered for exactly-once semantics
        await this.redis.sadd('delivery:completed', messageId);
        await this.redis.expire('delivery:completed', 86400); // 24 hours
        this.inFlightMessages.delete(messageId);
        this.emit('delivery:completed', { messageId });
    }
    /**
     * Fail message delivery
     */
    async fail(messageId, error) {
        const record = this.deliveryRecords.get(messageId);
        if (!record) {
            throw new Error(`No delivery record for message ${messageId}`);
        }
        record.status = types_js_1.MessageStatus.FAILED;
        record.failedAt = new Date();
        record.error = error;
        await this.redis.hset('delivery:records', messageId, JSON.stringify(record));
        this.inFlightMessages.delete(messageId);
        this.emit('delivery:failed', { messageId, error });
    }
    /**
     * Retry message delivery
     */
    async retry(messageId) {
        const record = this.deliveryRecords.get(messageId);
        if (!record) {
            throw new Error(`No delivery record for message ${messageId}`);
        }
        record.attempts++;
        record.lastAttemptedAt = new Date();
        record.status = types_js_1.MessageStatus.PENDING;
        await this.redis.hset('delivery:records', messageId, JSON.stringify(record));
        this.emit('delivery:retry', { messageId, attempt: record.attempts });
    }
    /**
     * Check if message has been delivered (for exactly-once)
     */
    async isDelivered(messageId) {
        return (await this.redis.sismember('delivery:completed', messageId)) === 1;
    }
    /**
     * Get delivery record
     */
    getRecord(messageId) {
        return this.deliveryRecords.get(messageId);
    }
    /**
     * Get all in-flight messages
     */
    getInFlightMessages() {
        return Array.from(this.inFlightMessages);
    }
    /**
     * Get delivery statistics
     */
    getStats() {
        const records = Array.from(this.deliveryRecords.values());
        return {
            totalMessages: records.length,
            inFlight: this.inFlightMessages.size,
            completed: records.filter(r => r.status === types_js_1.MessageStatus.COMPLETED)
                .length,
            failed: records.filter(r => r.status === types_js_1.MessageStatus.FAILED).length
        };
    }
}
exports.DeliveryManager = DeliveryManager;
