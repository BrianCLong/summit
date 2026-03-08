"use strict";
/**
 * DeadLetterQueue - Dead letter queue management
 *
 * Handle failed messages and provide replay capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadLetterQueue = void 0;
const events_1 = require("events");
class DeadLetterQueue extends events_1.EventEmitter {
    redis;
    name;
    constructor(redis, name) {
        super();
        this.redis = redis;
        this.name = name;
    }
    /**
     * Add message to dead letter queue
     */
    async add(envelope, failureReason, originalDestination) {
        const dlqMessage = {
            envelope,
            failureReason,
            failedAt: new Date(),
            originalTopic: originalDestination?.topic,
            originalQueue: originalDestination?.queue
        };
        const key = `dlq:${this.name}`;
        await this.redis.lpush(key, JSON.stringify(dlqMessage));
        // Update stats
        await this.redis.hincrby(`dlq:${this.name}:stats`, 'total', 1);
        await this.redis.hincrby(`dlq:${this.name}:stats`, `reason:${failureReason}`, 1);
        this.emit('message:added', {
            messageId: envelope.metadata.messageId,
            reason: failureReason
        });
    }
    /**
     * Get messages from DLQ
     */
    async getMessages(offset = 0, limit = 100) {
        const key = `dlq:${this.name}`;
        const messages = await this.redis.lrange(key, offset, offset + limit - 1);
        return messages.map(msg => JSON.parse(msg));
    }
    /**
     * Remove message from DLQ
     */
    async remove(messageId) {
        const key = `dlq:${this.name}`;
        const messages = await this.redis.lrange(key, 0, -1);
        for (const msgStr of messages) {
            const msg = JSON.parse(msgStr);
            if (msg.envelope.metadata.messageId === messageId) {
                await this.redis.lrem(key, 1, msgStr);
                await this.redis.hincrby(`dlq:${this.name}:stats`, 'total', -1);
                return true;
            }
        }
        return false;
    }
    /**
     * Replay message back to original destination
     */
    async replay(messageId) {
        const messages = await this.getMessages();
        const dlqMessage = messages.find(m => m.envelope.metadata.messageId === messageId);
        if (!dlqMessage) {
            return false;
        }
        // Message would be replayed by the caller
        this.emit('message:replay', {
            messageId,
            originalTopic: dlqMessage.originalTopic,
            originalQueue: dlqMessage.originalQueue
        });
        await this.remove(messageId);
        return true;
    }
    /**
     * Replay all messages
     */
    async replayAll() {
        const messages = await this.getMessages(0, 1000);
        for (const dlqMessage of messages) {
            await this.replay(dlqMessage.envelope.metadata.messageId);
        }
        return messages.length;
    }
    /**
     * Purge DLQ
     */
    async purge() {
        const key = `dlq:${this.name}`;
        const count = await this.redis.llen(key);
        await this.redis.del(key);
        await this.redis.del(`dlq:${this.name}:stats`);
        this.emit('dlq:purged', { count });
        return count;
    }
    /**
     * Get DLQ statistics
     */
    async getStats() {
        const messages = await this.getMessages();
        const statsKey = `dlq:${this.name}:stats`;
        const stats = await this.redis.hgetall(statsKey);
        const messagesByReason = {};
        for (const [key, value] of Object.entries(stats)) {
            if (key.startsWith('reason:')) {
                const reason = key.substring(7);
                messagesByReason[reason] = parseInt(value, 10);
            }
        }
        let oldestMessage;
        let newestMessage;
        if (messages.length > 0) {
            oldestMessage = new Date(messages[messages.length - 1].failedAt);
            newestMessage = new Date(messages[0].failedAt);
        }
        return {
            totalMessages: messages.length,
            oldestMessage,
            newestMessage,
            messagesByReason
        };
    }
    /**
     * Get DLQ name
     */
    getName() {
        return this.name;
    }
}
exports.DeadLetterQueue = DeadLetterQueue;
