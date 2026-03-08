"use strict";
/**
 * Presence Tracking Manager
 * Manages user presence across rooms with Redis persistence
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceManager = void 0;
const logger_js_1 = require("../utils/logger.js");
class PresenceManager {
    redis;
    ttl;
    keyPrefix = 'presence';
    constructor(redis, ttlSeconds = 300) {
        this.redis = redis;
        this.ttl = ttlSeconds;
    }
    /**
     * Set user presence in a room
     */
    async setPresence(room, userId, data) {
        const key = this.getRoomKey(room);
        const presence = {
            userId,
            status: data.status || 'online',
            lastSeen: Date.now(),
            username: data.username,
            metadata: data.metadata,
        };
        await this.redis
            .multi()
            .hset(key, userId, JSON.stringify(presence))
            .expire(key, this.ttl)
            .exec();
        logger_js_1.logger.debug({ room, userId, status: presence.status }, 'Presence set');
    }
    /**
     * Update user presence status
     */
    async updateStatus(room, userId, status, metadata) {
        const key = this.getRoomKey(room);
        const existingData = await this.redis.hget(key, userId);
        if (existingData) {
            const presence = JSON.parse(existingData);
            presence.status = status;
            presence.lastSeen = Date.now();
            if (metadata) {
                presence.metadata = { ...presence.metadata, ...metadata };
            }
            await this.redis
                .multi()
                .hset(key, userId, JSON.stringify(presence))
                .expire(key, this.ttl)
                .exec();
            logger_js_1.logger.debug({ room, userId, status }, 'Presence status updated');
        }
    }
    /**
     * Touch user presence (update lastSeen)
     */
    async touchPresence(room, userId) {
        const key = this.getRoomKey(room);
        const existingData = await this.redis.hget(key, userId);
        if (existingData) {
            const presence = JSON.parse(existingData);
            presence.lastSeen = Date.now();
            await this.redis
                .multi()
                .hset(key, userId, JSON.stringify(presence))
                .expire(key, this.ttl)
                .exec();
        }
    }
    /**
     * Remove user presence from room
     */
    async removePresence(room, userId) {
        const key = this.getRoomKey(room);
        await this.redis.hdel(key, userId);
        logger_js_1.logger.debug({ room, userId }, 'Presence removed');
    }
    /**
     * Get all presence in a room
     */
    async getRoomPresence(room) {
        const key = this.getRoomKey(room);
        const data = await this.redis.hgetall(key);
        const presence = [];
        const now = Date.now();
        const staleThreshold = this.ttl * 1000;
        for (const [userId, json] of Object.entries(data)) {
            try {
                const info = JSON.parse(json);
                // Filter out stale presence
                if (now - info.lastSeen < staleThreshold) {
                    presence.push(info);
                }
                else {
                    // Clean up stale entry
                    await this.redis.hdel(key, userId);
                }
            }
            catch (error) {
                logger_js_1.logger.warn({ userId, error }, 'Failed to parse presence data');
            }
        }
        return presence;
    }
    /**
     * Get user presence in a room
     */
    async getUserPresence(room, userId) {
        const key = this.getRoomKey(room);
        const data = await this.redis.hget(key, userId);
        if (!data) {
            return null;
        }
        try {
            return JSON.parse(data);
        }
        catch (error) {
            logger_js_1.logger.warn({ room, userId, error }, 'Failed to parse user presence');
            return null;
        }
    }
    /**
     * Get all rooms where user is present
     */
    async getUserRooms(userId) {
        const pattern = `${this.keyPrefix}:room:*`;
        const rooms = [];
        let cursor = '0';
        do {
            const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = newCursor;
            for (const key of keys) {
                const hasUser = await this.redis.hexists(key, userId);
                if (hasUser) {
                    const room = key.replace(`${this.keyPrefix}:room:`, '');
                    rooms.push(room);
                }
            }
        } while (cursor !== '0');
        return rooms;
    }
    /**
     * Clear all presence in a room
     */
    async clearRoom(room) {
        const key = this.getRoomKey(room);
        await this.redis.del(key);
        logger_js_1.logger.debug({ room }, 'Room presence cleared');
    }
    /**
     * Get presence statistics
     */
    async getStats() {
        const pattern = `${this.keyPrefix}:room:*`;
        const userIds = new Set();
        const statusCounts = {
            online: 0,
            away: 0,
            busy: 0,
            offline: 0,
        };
        let cursor = '0';
        let roomCount = 0;
        do {
            const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = newCursor;
            roomCount += keys.length;
            for (const key of keys) {
                const data = await this.redis.hgetall(key);
                for (const [userId, json] of Object.entries(data)) {
                    userIds.add(userId);
                    try {
                        const info = JSON.parse(json);
                        statusCounts[info.status]++;
                    }
                    catch (error) {
                        // Ignore parse errors in stats
                    }
                }
            }
        } while (cursor !== '0');
        return {
            totalRooms: roomCount,
            totalUsers: userIds.size,
            byStatus: statusCounts,
        };
    }
    getRoomKey(room) {
        return `${this.keyPrefix}:room:${room}`;
    }
}
exports.PresenceManager = PresenceManager;
