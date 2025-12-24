// @ts-nocheck
import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import Redis from 'ioredis';
import { queueProcessingDuration, queueProcessed } from '../../../libs/ops/src/metrics-queue.js';

export type JobPayload = Record<string, unknown>;

export interface Job {
  id: string;
  type: 'OCR' | 'PDF' | 'NLQ_PLAN' | string;
  payload: JobPayload;
  enqueuedAt?: number;
}

export interface WorkerContext {
  redis: Redis;
}

type JobHandler = (job: Job, ctx: WorkerContext) => Promise<Record<string, unknown>>;

const redis = new Redis(process.env.REDIS_ADDR as string, {
  password: process.env.REDIS_PASS,
  lazyConnect: true
});

const HANDLERS: Record<string, JobHandler> = {
  async OCR(job: Job) {
    const source = job.payload.filePath ?? job.payload.content;
    if (typeof source !== 'string' || source.length === 0) {
      throw new Error('ocr_payload_invalid');
    }

    const text = source.startsWith('/')
      ? await readFile(source, 'utf8')
      : Buffer.from(source, 'base64').toString('utf8');

    return { textLength: text.length, preview: text.slice(0, 128) };
  },
  async PDF(job: Job) {
    const pages = Array.isArray(job.payload.pages)
      ? (job.payload.pages as unknown[])
      : [job.payload.page];
    const strings = pages.filter((page): page is string => typeof page === 'string');
    if (strings.length === 0) {
      throw new Error('pdf_payload_invalid');
    }

    const combined = strings.join('\n');
    const artifact = Buffer.from(combined).toString('base64');
    return { artifact, pageCount: strings.length };
  },
  async NLQ_PLAN(job: Job) {
    const question = job.payload.question;
    if (typeof question !== 'string' || question.length === 0) {
      throw new Error('nlq_payload_invalid');
    }

    const steps = [
      'tokenize question',
      'select candidate entities',
      'build cypher query',
      'validate against schema'
    ];

    return {
      plan: steps,
      summary: `Plan for: ${question}`
    };
  }
};

export function registerHandler(type: string, handler: JobHandler): void {
  HANDLERS[type] = handler;
}

function deserializeJob(payload: string): Job {
  const parsed = JSON.parse(payload) as Partial<Job>;
  if (!parsed.type) {
    throw new Error('job_missing_type');
  }
  return {
    id: parsed.id ?? crypto.randomUUID(),
    type: parsed.type,
    payload: (parsed.payload ?? {}) as JobPayload,
    enqueuedAt: parsed.enqueuedAt
  };
}

async function recordResult(job: Job, result: Record<string, unknown>, ctx: WorkerContext): Promise<void> {
  const key = `job:result:${job.id}`;
  await ctx.redis.hset(key, {
    status: 'completed',
    type: job.type,
    result: JSON.stringify(result),
    processedAt: Date.now().toString()
  });
  await ctx.redis.expire(key, 3600);
}

async function recordFailure(job: Job, error: unknown, ctx: WorkerContext): Promise<void> {
  const key = `job:result:${job.id}`;
  await ctx.redis.hset(key, {
    status: 'failed',
    type: job.type,
    error: error instanceof Error ? error.message : 'unknown_error',
    processedAt: Date.now().toString()
  });
  await ctx.redis.expire(key, 3600);
}

export async function processPayload(raw: string, ctx: WorkerContext): Promise<void> {
  const job = deserializeJob(raw);
  const handler = HANDLERS[job.type];
  const timer = queueProcessingDuration.startTimer({ type: job.type });
  try {
    if (!handler) {
      throw new Error(`unhandled_job_type:${job.type}`);
    }

    const result = await handler(job, ctx);
    await recordResult(job, result, ctx);
    queueProcessed.inc({ status: 'success', type: job.type });
  } catch (err) {
    queueProcessed.inc({ status: 'failure', type: job.type });
    await recordFailure(job, err, ctx);
    throw err;
  } finally {
    timer();
  }
}

async function runLoop(): Promise<void> {
  await redis.connect();
  const ctx: WorkerContext = { redis };

  for (;;) {
    const job = await redis.brpop('jobs', 5);
    if (!job) {
      continue;
    }

    const [, payload] = job;
    try {
      await processPayload(payload, ctx);
    } catch (err) {
      console.error('job_fail', err);
    }
  }
}

runLoop().catch((err) => {
  console.error(err);
  process.exit(1);
});
