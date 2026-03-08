"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisQuotaStore = void 0;
const luxon_1 = require("luxon");
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new ioredis_1.default(REDIS_URL);
class RedisQuotaStore {
    client;
    constructor(redisClient = redis) {
        this.client = redisClient;
    }
    getKey(model, unit, timestamp, period) {
        let datePart;
        const dt = luxon_1.DateTime.fromMillis(timestamp);
        switch (period) {
            case 'minute':
                datePart = dt.toFormat('yyyyMMddHHmm');
                break;
            case 'hour':
                datePart = dt.toFormat('yyyyMMddHH');
                break;
            case 'day':
                datePart = dt.toFormat('yyyyMMdd');
                break;
            case 'week':
                datePart = dt.toFormat('yyyyW');
                break;
        }
        return `quota:${model}:${unit}:${period}:${datePart}`;
    }
    async record(model, unit, amount) {
        const now = Date.now();
        const pipeline = this.client.pipeline();
        // Record for minute, hour, day, week buckets
        const minuteKey = this.getKey(model, unit, now, 'minute');
        pipeline.incrby(minuteKey, amount);
        pipeline.expire(minuteKey, 60 * 60 * 24 * 7); // Keep for 7 days
        const hourKey = this.getKey(model, unit, now, 'hour');
        pipeline.incrby(hourKey, amount);
        pipeline.expire(hourKey, 60 * 60 * 24 * 7); // Keep for 7 days
        const dayKey = this.getKey(model, unit, now, 'day');
        pipeline.incrby(dayKey, amount);
        pipeline.expire(dayKey, 60 * 60 * 24 * 7); // Keep for 7 days
        const weekKey = this.getKey(model, unit, now, 'week');
        pipeline.incrby(weekKey, amount);
        pipeline.expire(weekKey, 60 * 60 * 24 * 7); // Keep for 7 days
        // Earliest event tracking for rolling window ETA
        const earliestEventKey = `quota:${model}:${unit}:earliest`;
        pipeline.zadd(earliestEventKey, 'NX', now, now.toString()); // Add if not exists
        pipeline.expire(earliestEventKey, 60 * 60 * 24 * 7); // Keep for 7 days
        await pipeline.exec();
    }
    async usedInRolling(model, unit, window) {
        const cutoff = luxon_1.DateTime.now().minus(window);
        const pipeline = this.client.pipeline();
        let totalUsed = 0;
        // Sum up minute buckets within the rolling window
        const startMinute = cutoff.startOf('minute');
        const endMinute = luxon_1.DateTime.now().startOf('minute');
        let currentMinute = startMinute;
        while (currentMinute <= endMinute) {
            const key = this.getKey(model, unit, currentMinute.toMillis(), 'minute');
            pipeline.get(key);
            currentMinute = currentMinute.plus({ minutes: 1 });
        }
        const results = await pipeline.exec();
        for (const [, result] of results) {
            if (result)
                totalUsed += parseInt(result, 10);
        }
        return totalUsed;
    }
    async usedInFixed(model, unit, period, tz) {
        const now = luxon_1.DateTime.now().setZone(tz);
        let start;
        let end;
        let key;
        if (period === 'daily') {
            start = now.startOf('day');
            end = now.endOf('day');
            key = this.getKey(model, unit, now.toMillis(), 'day');
        }
        else {
            // weekly
            start = now.startOf('week');
            end = now.endOf('week');
            key = this.getKey(model, unit, now.toMillis(), 'week');
        }
        const used = parseInt((await this.client.get(key)) || '0', 10);
        return { used, windowStart: start.toISO(), windowEnd: end.toISO() };
    }
    async getEarliestEventTimestamp(model, unit) {
        const earliestEventKey = `quota:${model}:${unit}:earliest`;
        const result = await this.client.zrange(earliestEventKey, 0, 0);
        return result.length > 0 ? parseInt(result[0], 10) : null;
    }
}
exports.RedisQuotaStore = RedisQuotaStore;
