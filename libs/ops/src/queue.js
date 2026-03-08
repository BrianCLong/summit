"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueue = enqueue;
exports.getQueueClient = getQueueClient;
exports.setQueueClient = setQueueClient;
const node_crypto_1 = __importDefault(require("node:crypto"));
const ioredis_1 = __importDefault(require("ioredis"));
const metrics_queue_js_1 = require("./metrics-queue.js");
function buildQueueClient() {
    if (process.env.FLAG_SCALE_KEDA !== '1') {
        return null;
    }
    const address = process.env.REDIS_ADDR;
    if (!address) {
        console.warn('queue_disabled_no_address');
        return null;
    }
    return new ioredis_1.default(address, { password: process.env.REDIS_PASS });
}
let queueClient = buildQueueClient();
async function enqueue(job) {
    if (!queueClient) {
        return null;
    }
    if (!job.type) {
        throw new Error('queue_job_missing_type');
    }
    const id = job.id ?? node_crypto_1.default.randomUUID();
    const enrichedJob = {
        ...job,
        id,
        enqueuedAt: job.enqueuedAt ?? Date.now()
    };
    await queueClient.lpush('jobs', JSON.stringify(enrichedJob));
    const depth = await queueClient.llen('jobs');
    metrics_queue_js_1.queueDepth.set(depth);
    return id;
}
function getQueueClient() {
    return queueClient;
}
function setQueueClient(client) {
    queueClient = client;
}
