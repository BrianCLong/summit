"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandler = registerHandler;
exports.processPayload = processPayload;
// @ts-nocheck
const promises_1 = require("node:fs/promises");
const node_buffer_1 = require("node:buffer");
const node_crypto_1 = __importDefault(require("node:crypto"));
const ioredis_1 = __importDefault(require("ioredis"));
const metrics_queue_js_1 = require("../../../libs/ops/src/metrics-queue.js");
const redis = new ioredis_1.default(process.env.REDIS_ADDR, {
    password: process.env.REDIS_PASS,
    lazyConnect: true
});
const HANDLERS = {
    async OCR(job) {
        const source = job.payload.filePath ?? job.payload.content;
        if (typeof source !== 'string' || source.length === 0) {
            throw new Error('ocr_payload_invalid');
        }
        const text = source.startsWith('/')
            ? await (0, promises_1.readFile)(source, 'utf8')
            : node_buffer_1.Buffer.from(source, 'base64').toString('utf8');
        return { textLength: text.length, preview: text.slice(0, 128) };
    },
    async PDF(job) {
        const pages = Array.isArray(job.payload.pages)
            ? job.payload.pages
            : [job.payload.page];
        const strings = pages.filter((page) => typeof page === 'string');
        if (strings.length === 0) {
            throw new Error('pdf_payload_invalid');
        }
        const combined = strings.join('\n');
        const artifact = node_buffer_1.Buffer.from(combined).toString('base64');
        return { artifact, pageCount: strings.length };
    },
    async NLQ_PLAN(job) {
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
function registerHandler(type, handler) {
    HANDLERS[type] = handler;
}
function deserializeJob(payload) {
    const parsed = JSON.parse(payload);
    if (!parsed.type) {
        throw new Error('job_missing_type');
    }
    return {
        id: parsed.id ?? node_crypto_1.default.randomUUID(),
        type: parsed.type,
        payload: (parsed.payload ?? {}),
        enqueuedAt: parsed.enqueuedAt
    };
}
async function recordResult(job, result, ctx) {
    const key = `job:result:${job.id}`;
    await ctx.redis.hset(key, {
        status: 'completed',
        type: job.type,
        result: JSON.stringify(result),
        processedAt: Date.now().toString()
    });
    await ctx.redis.expire(key, 3600);
}
async function recordFailure(job, error, ctx) {
    const key = `job:result:${job.id}`;
    await ctx.redis.hset(key, {
        status: 'failed',
        type: job.type,
        error: error instanceof Error ? error.message : 'unknown_error',
        processedAt: Date.now().toString()
    });
    await ctx.redis.expire(key, 3600);
}
async function processPayload(raw, ctx) {
    const job = deserializeJob(raw);
    const handler = HANDLERS[job.type];
    const timer = metrics_queue_js_1.queueProcessingDuration.startTimer({ type: job.type });
    try {
        if (!handler) {
            throw new Error(`unhandled_job_type:${job.type}`);
        }
        const result = await handler(job, ctx);
        await recordResult(job, result, ctx);
        metrics_queue_js_1.queueProcessed.inc({ status: 'success', type: job.type });
    }
    catch (err) {
        metrics_queue_js_1.queueProcessed.inc({ status: 'failure', type: job.type });
        await recordFailure(job, err, ctx);
        throw err;
    }
    finally {
        timer();
    }
}
async function runLoop() {
    await redis.connect();
    const ctx = { redis };
    for (;;) {
        const job = await redis.brpop('jobs', 5);
        if (!job) {
            continue;
        }
        const [, payload] = job;
        try {
            await processPayload(payload, ctx);
        }
        catch (err) {
            console.error('job_fail', err);
        }
    }
}
runLoop().catch((err) => {
    console.error(err);
    process.exit(1);
});
