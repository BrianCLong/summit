"use strict";
/**
 * Message Persistence Manager
 * Stores messages in Redis for replay on reconnection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagePersistence = void 0;
const logger_js_1 = require("../utils/logger.js");
const crypto_1 = require("crypto");
const channel_manager_js_1 = require("../lib/channel-manager.js");
class MessagePersistence {
    redis;
    ttl;
    maxMessages;
    keyPrefix = 'messages';
    channel;
    constructor(redis, ttlSeconds = 3600, maxMessages = 1000) {
        this.redis = redis;
        this.ttl = ttlSeconds;
        this.maxMessages = maxMessages;
        this.channel = new channel_manager_js_1.MPSCChannel(1000);
        this.processMessages();
    }
    async processMessages() {
        for await (const message of this.channel) {
            try {
                const key = this.getRoomKey(message.room);
                const value = JSON.stringify(message);
                const score = message.timestamp;
                const pipeline = this.redis.pipeline();
                pipeline.zadd(key, score, value);
                pipeline.zremrangebyrank(key, 0, -(this.maxMessages + 1));
                pipeline.expire(key, message.ttl || this.ttl);
                await pipeline.exec();
                logger_js_1.logger.debug({ messageId: message.id }, 'Persisted message from channel');
            }
            catch (error) {
                logger_js_1.logger.error({ error, messageId: message.id }, 'Error persisting message from channel');
            }
        }
    }
    /**
     * Store a message
     */
    async storeMessage(message) {
        const fullMessage = {
            id: (0, crypto_1.randomUUID)(),
            ...message,
            timestamp: message.timestamp || Date.now(),
        };
        await this.channel.send(fullMessage);
        logger_js_1.logger.debug({ messageId: fullMessage.id }, 'Message queued for persistence');
        return fullMessage;
    }
    /**
     * Get recent messages from a room
     */
    async getRecentMessages(room, limit = 100, since) {
        const key = this.getRoomKey(room);
        // Get messages with timestamp > since
        const minScore = since || '-inf';
        const values = await this.redis.zrangebyscore(key, minScore, '+inf', 'LIMIT', 0, limit);
        const messages = [];
        for (const value of values) {
            try {
                const message = JSON.parse(value);
                messages.push(message);
            }
            catch (error) {
                logger_js_1.logger.warn({ error, value }, 'Failed to parse persisted message');
            }
        }
        return messages;
    }
    /**
     * Get messages in time range
     */
    async getMessagesByTimeRange(room, startTime, endTime) {
        const key = this.getRoomKey(room);
        const values = await this.redis.zrangebyscore(key, startTime, endTime);
        const messages = [];
        for (const value of values) {
            try {
                const message = JSON.parse(value);
                messages.push(message);
            }
            catch (error) {
                logger_js_1.logger.warn({ error }, 'Failed to parse message');
            }
        }
        return messages;
    }
    /**
     * Get message by ID
     */
    async getMessage(room, messageId) {
        const messages = await this.getRecentMessages(room, 1000);
        return messages.find(m => m.id === messageId) || null;
    }
    /**
     * Delete messages older than timestamp
     */
    async deleteOldMessages(room, beforeTimestamp) {
        const key = this.getRoomKey(room);
        const deleted = await this.redis.zremrangebyscore(key, '-inf', beforeTimestamp);
        logger_js_1.logger.debug({ room, deleted, beforeTimestamp }, 'Deleted old messages');
        return deleted;
    }
    /**
     * Clear all messages in a room
     */
    async clearRoom(room) {
        const key = this.getRoomKey(room);
        await this.redis.del(key);
        logger_js_1.logger.debug({ room }, 'Room messages cleared');
    }
    /**
     * Get message count for a room
     */
    async getMessageCount(room) {
        const key = this.getRoomKey(room);
        return await this.redis.zcard(key);
    }
    /**
     * Get statistics
     */
    async getStats() {
        const pattern = `${this.keyPrefix}:room:*`;
        let totalMessages = 0;
        let oldestMessage = null;
        let newestMessage = null;
        let cursor = '0';
        let roomCount = 0;
        do {
            const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = newCursor;
            roomCount += keys.length;
            for (const key of keys) {
                const count = await this.redis.zcard(key);
                totalMessages += count;
                if (count > 0) {
                    // Get oldest and newest timestamps
                    const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
                    const newest = await this.redis.zrange(key, -1, -1, 'WITHSCORES');
                    if (oldest.length >= 2) {
                        const timestamp = oldest[1] ? parseFloat(oldest[1]) : 0;
                        if (oldestMessage === null || timestamp < oldestMessage) {
                            oldestMessage = timestamp;
                        }
                    }
                    if (newest.length >= 2) {
                        const timestamp = newest[1] ? parseFloat(newest[1]) : 0;
                        if (newestMessage === null || timestamp > newestMessage) {
                            newestMessage = timestamp;
                        }
                    }
                }
            }
        } while (cursor !== '0');
        return {
            totalRooms: roomCount,
            totalMessages,
            oldestMessage,
            newestMessage,
        };
    }
    /**
     * Cleanup expired messages across all rooms
     */
    async cleanupExpired() {
        const pattern = `${this.keyPrefix}:room:*`;
        let totalDeleted = 0;
        const now = Date.now();
        let cursor = '0';
        do {
            const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = newCursor;
            for (const key of keys) {
                const expiredBefore = now - this.ttl * 1000;
                const deleted = await this.redis.zremrangebyscore(key, '-inf', expiredBefore);
                totalDeleted += deleted;
                // Remove empty keys
                const remaining = await this.redis.zcard(key);
                if (remaining === 0) {
                    await this.redis.del(key);
                }
            }
        } while (cursor !== '0');
        if (totalDeleted > 0) {
            logger_js_1.logger.info({ totalDeleted }, 'Cleaned up expired messages');
        }
        return totalDeleted;
    }
    getRoomKey(room) {
        return `${this.keyPrefix}:room:${room}`;
    }
}
exports.MessagePersistence = MessagePersistence;
