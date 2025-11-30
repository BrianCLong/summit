import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';
import {
  getRedisClient,
  getRedisConnectionOptions,
  isRedisMock,
} from '../db/redis.js';
import { getNeo4jDriver } from '../db/neo4j.js';
import { responseCache, buildCacheKey } from '../cache/responseCache.js';
import { cfg } from '../config.js';

const logger = pino({ name: 'cache-warmup-worker' });

interface CacheWarmupJob {
  query: string;
  limit: number;
  skip: number;
  tenantId?: string;
}

const QUEUE_NAME = 'performance-cache-warmup';
const DEFAULT_LIMIT = 25;
const JOB_TTL_MS = 5 * 60 * 1000;
const MAX_LIMIT = 100;

let queue: Queue<CacheWarmupJob> | null = null;
let worker: Worker<CacheWarmupJob> | null = null;
let queueConnection: Redis | null = null;

function resolveRedisConnection(): Redis | null {
  const redis = getRedisClient();
  if (isRedisMock(redis)) {
    logger.warn('Skipping cache warmup queue because Redis is in mock mode');
    return null;
  }

  if (!queueConnection) {
    queueConnection = new Redis({
      ...getRedisConnectionOptions(),
      enableReadyCheck: true,
      maxRetriesPerRequest: 2,
    });
    queueConnection.on('error', (err) => {
      logger.warn({ err }, 'Cache warmup Redis connection error');
    });
  }

  return queueConnection;
}

function getQueue(): Queue<CacheWarmupJob> | null {
  if (queue) {
    return queue;
  }

  const connection = resolveRedisConnection();
  if (!connection) {
    return null;
  }

  queue = new Queue<CacheWarmupJob>(QUEUE_NAME, { connection });
  return queue;
}

async function processJob(job: Job<CacheWarmupJob>): Promise<void> {
  const { query, limit, skip, tenantId } = job.data;
  const driver = getNeo4jDriver();
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

    const cacheKey = buildCacheKey(
      'evidence-search',
      `${tenantId ?? 'public'}:${query}:${skip}:${limit}`,
    );

    await responseCache.setCachedJson(cacheKey, payload);
  } finally {
    await session.close();
  }
}

export async function startCacheWarmupWorker(): Promise<void> {
  if (worker) {
    return;
  }

  if (!cfg.ENABLE_CACHE_WARMER) {
    logger.info('Cache warmup worker disabled via configuration');
    return;
  }

  try {
    const connection = resolveRedisConnection();
    if (!connection) {
      return;
    }
    worker = new Worker<CacheWarmupJob>(QUEUE_NAME, processJob, {
      connection,
      concurrency: cfg.CACHE_WARMER_CONCURRENCY,
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
  } catch (error) {
    logger.warn({ err: error }, 'Failed to start cache warmup worker');
  }
}

export async function enqueueCacheWarmup(job: Partial<CacheWarmupJob>): Promise<void> {
  if (!cfg.ENABLE_CACHE_WARMER) {
    return;
  }

  const safeJob: CacheWarmupJob = {
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
    await warmupQueue.add(
      'warm-cache',
      safeJob,
      {
        jobId: `warm-${safeJob.tenantId ?? 'public'}-${safeJob.query}-${safeJob.skip}-${safeJob.limit}`,
        removeOnComplete: true,
        removeOnFail: { count: 10 },
        priority: 5,
        delay: 0,
        attempts: 2,
        backoff: { type: 'exponential', delay: 500 },
        timeout: JOB_TTL_MS,
      },
    );
  } catch (error) {
    logger.warn({ err: error }, 'Failed to enqueue cache warmup job');
  }
}
