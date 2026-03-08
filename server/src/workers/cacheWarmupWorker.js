"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCacheWarmupWorker = startCacheWarmupWorker;
exports.enqueueCacheWarmup = enqueueCacheWarmup;
// @ts-nocheck
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const redis_js_1 = require("../db/redis.js");
const neo4j_js_1 = require("../db/neo4j.js");
const responseCache_js_1 = require("../cache/responseCache.js");
const config_js_1 = require("../config.js");
const logger = pino_1.default({ name: 'cache-warmup-worker' });
const QUEUE_NAME = 'performance-cache-warmup';
const DEFAULT_LIMIT = 25;
const JOB_TTL_MS = 5 * 60 * 1000;
const MAX_LIMIT = 100;
let queue = null;
let worker = null;
let queueConnection = null;
function resolveRedisConnection() {
    const redis = (0, redis_js_1.getRedisClient)();
    if ((0, redis_js_1.isRedisMock)(redis)) {
        logger.warn('Skipping cache warmup queue because Redis is in mock mode');
        return null;
    }
    if (!queueConnection) {
        queueConnection = new ioredis_1.default({
            ...(0, redis_js_1.getRedisConnectionOptions)(),
            enableReadyCheck: true,
            maxRetriesPerRequest: 2,
        });
        queueConnection.on('error', (err) => {
            logger.warn({ err }, 'Cache warmup Redis connection error');
        });
    }
    return queueConnection;
}
function getQueue() {
    if (queue) {
        return queue;
    }
    const connection = resolveRedisConnection();
    if (!connection) {
        return null;
    }
    queue = new bullmq_1.Queue(QUEUE_NAME, { connection });
    return queue;
}
async function processJob(job) {
    const { query, limit, skip, tenantId } = job.data;
    const driver = (0, neo4j_js_1.getNeo4jDriver)();
    const session = driver.session();
    try {
        const searchQuery = `
        CALL db.index.fulltext.queryNodes("evidenceContentSearch", $query) YIELD node, score
        RETURN node, score
        SKIP $skip
        LIMIT $limit
      `;
        const countQuery = `
        CALL db.index.fulltext.queryNodes("evidenceContentSearch", $query) YIELD node
        RETURN count(node) as total
      `;
        const [searchResult, countResult] = await Promise.all([
            session.run(searchQuery, { query, skip, limit }),
            session.run(countQuery, { query }),
        ]);
        const evidence = searchResult.records.map((record) => ({
            node: record.get('node').properties,
            score: record.get('score'),
        }));
        const total = countResult.records[0].get('total').toNumber();
        const payload = {
            data: evidence,
            metadata: {
                total,
                skip,
                limit,
                pages: Math.ceil(total / Number(limit || DEFAULT_LIMIT)),
                currentPage: Math.floor(Number(skip) / Number(limit || DEFAULT_LIMIT)) + 1,
                query,
                tenantId,
            },
        };
        const cacheKey = (0, responseCache_js_1.buildCacheKey)('evidence-search', `${tenantId ?? 'public'}:${query}:${skip}:${limit}`);
        await responseCache_js_1.responseCache.setCachedJson(cacheKey, payload);
    }
    finally {
        await session.close();
    }
}
async function startCacheWarmupWorker() {
    if (worker) {
        return;
    }
    if (!config_js_1.cfg.ENABLE_CACHE_WARMER) {
        logger.info('Cache warmup worker disabled via configuration');
        return;
    }
    try {
        const connection = resolveRedisConnection();
        if (!connection) {
            return;
        }
        worker = new bullmq_1.Worker(QUEUE_NAME, processJob, {
            connection,
            concurrency: config_js_1.cfg.CACHE_WARMER_CONCURRENCY,
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
        });
        worker.on('completed', (job) => {
            logger.debug({ jobId: job.id, name: job.name }, 'Cache warmup job completed');
        });
        worker.on('failed', (job, err) => {
            logger.warn({ jobId: job?.id, err }, 'Cache warmup job failed');
        });
        logger.info('Cache warmup worker started');
    }
    catch (error) {
        logger.warn({ err: error }, 'Failed to start cache warmup worker');
    }
}
async function enqueueCacheWarmup(job) {
    if (!config_js_1.cfg.ENABLE_CACHE_WARMER) {
        return;
    }
    const safeJob = {
        query: job.query?.trim() || '',
        limit: Math.min(job.limit ?? DEFAULT_LIMIT, MAX_LIMIT),
        skip: job.skip ?? 0,
        tenantId: job.tenantId,
    };
    if (!safeJob.query) {
        return;
    }
    try {
        const warmupQueue = getQueue();
        if (!warmupQueue) {
            return;
        }
        await warmupQueue.add('warm-cache', safeJob, {
            jobId: `warm-${safeJob.tenantId ?? 'public'}-${safeJob.query}-${safeJob.skip}-${safeJob.limit}`,
            removeOnComplete: true,
            removeOnFail: { count: 10 },
            priority: 5,
            delay: 0,
            attempts: 2,
            backoff: { type: 'exponential', delay: 500 },
            timeout: JOB_TTL_MS,
        });
    }
    catch (error) {
        logger.warn({ err: error }, 'Failed to enqueue cache warmup job');
    }
}
