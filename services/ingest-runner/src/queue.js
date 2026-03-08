"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestQueue = void 0;
exports.scheduleIngest = scheduleIngest;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const connection = new ioredis_1.default({ host: REDIS_HOST, port: REDIS_PORT });
exports.ingestQueue = new bullmq_1.Queue('ingest-jobs', {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 1000 // 1s, 2s, 4s...
        },
        removeOnComplete: true
    }
});
async function scheduleIngest(connectorName, resourceId) {
    await exports.ingestQueue.add('pull', { connectorName, resourceId });
}
