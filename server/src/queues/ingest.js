"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addIngestJob = void 0;
const redis_js_1 = require("../db/redis.js");
const redisClient = (0, redis_js_1.getRedisClient)();
const INGEST_QUEUE_NAME = 'ingest-queue';
const addIngestJob = async (data) => {
    // Use a simple Redis LPUSH to add the job to the queue.
    // The Python worker will use BLPOP to consume it.
    await redisClient.lpush(INGEST_QUEUE_NAME, JSON.stringify(data));
};
exports.addIngestJob = addIngestJob;
