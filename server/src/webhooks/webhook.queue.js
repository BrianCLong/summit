"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});
exports.webhookQueue = new bullmq_1.Queue('webhooks', {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for inspection
    },
});
