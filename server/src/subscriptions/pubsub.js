"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.makePubSub = makePubSub;
const graphql_subscriptions_1 = require("graphql-subscriptions");
// @ts-expect-error - RedisPubSub type not exported properly
const graphql_redis_subscriptions_1 = require("graphql-redis-subscriptions");
const ioredis_1 = __importDefault(require("ioredis"));
let redisClient = null;
function makePubSub() {
    const url = process.env.REDIS_URL;
    if (!url) {
        console.warn('REDIS_URL not provided, using in-memory PubSub');
        return new graphql_subscriptions_1.PubSub(); // dev in-memory
    }
    try {
        const opts = {
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
            enableOfflineQueue: false,
            lazyConnect: true,
            maxmemoryPolicy: 'noeviction',
        };
        const publisher = new ioredis_1.default(url, opts);
        const subscriber = new ioredis_1.default(url, opts);
        // Store reference for health checks
        redisClient = publisher;
        // Error handling
        publisher.on('error', (err) => {
            console.error('Redis Publisher Error:', err);
        });
        subscriber.on('error', (err) => {
            console.error('Redis Subscriber Error:', err);
        });
        console.log('Using Redis PubSub for subscriptions');
        return new graphql_redis_subscriptions_1.RedisPubSub({ publisher, subscriber });
    }
    catch (error) {
        console.error('Failed to connect to Redis, falling back to in-memory PubSub:', error);
        return new graphql_subscriptions_1.PubSub();
    }
}
exports.redis = {
    healthCheck: async () => {
        if (!redisClient) {
            return false;
        }
        try {
            const result = await redisClient.ping();
            return result === 'PONG';
        }
        catch (error) {
            console.error('Redis health check failed:', error);
            return false;
        }
    },
    ping: async () => {
        if (!redisClient) {
            throw new Error('Redis client not initialized');
        }
        return await redisClient.ping();
    },
    // Cache for OPA decisions with TTL
    setWithTTL: async (key, value, ttlSeconds = 300) => {
        if (!redisClient)
            return false;
        try {
            await redisClient.setex(key, ttlSeconds, value);
            return true;
        }
        catch (error) {
            console.error('Redis setWithTTL failed:', error);
            return false;
        }
    },
    setWithTTLIfNotExists: async (key, value, ttlSeconds = 300) => {
        if (!redisClient)
            return false;
        try {
            const result = await redisClient.set(key, value, 'EX', ttlSeconds, 'NX');
            return result === 'OK';
        }
        catch (error) {
            console.error('Redis setWithTTLIfNotExists failed:', error);
            return false;
        }
    },
    setex: async (key, ttlSeconds, value) => {
        if (!redisClient)
            return false;
        try {
            await redisClient.setex(key, ttlSeconds, value);
            return true;
        }
        catch (error) {
            console.error('Redis setex failed:', error);
            return false;
        }
    },
    get: async (key) => {
        if (!redisClient)
            return null;
        try {
            return await redisClient.get(key);
        }
        catch (error) {
            console.error('Redis get failed:', error);
            return null;
        }
    },
};
