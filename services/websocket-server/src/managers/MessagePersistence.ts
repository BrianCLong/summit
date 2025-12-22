import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

export interface StoredMessage {
    room: string;
    from: string;
    data: Record<string, unknown>;
    timestamp?: number;
}

export class MessagePersistence {
    constructor(
        private redis: Redis,
        private ttlSeconds: number = 3600,
        private maxMessages: number = 1000
    ) { }

    /**
     * Store a message in the room's history
     */
    public async storeMessage(message: StoredMessage): Promise<void> {
        const key = `messages:room:${message.room}`;
        const timestamp = message.timestamp || Date.now();
        const payload = JSON.stringify({ ...message, timestamp });

        try {
            const multi = this.redis.multi();

            // Add message with timestamp score
            multi.zadd(key, timestamp, payload);

            // Trim to max size (keep last N messages)
            multi.zremrangebyrank(key, 0, -(this.maxMessages + 1));

            // Set expiry
            multi.expire(key, this.ttlSeconds);

            await multi.exec();
        } catch (error) {
            logger.error({ error, room: message.room }, 'Failed to persist message');
            throw error;
        }
    }

    /**
     * Retrieve message history for a room
     */
    public async getHistory(room: string, limit: number = 50): Promise<StoredMessage[]> {
        const key = `messages:room:${room}`;

        try {
            // Get last N messages
            const rawMessages = await this.redis.zrange(key, -limit, -1);

            return rawMessages.map(msg => JSON.parse(msg));
        } catch (error) {
            logger.error({ error, room }, 'Failed to retrieve message history');
            return [];
        }
    }
}
