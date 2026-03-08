"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const types_js_1 = require("../src/queue/types.js");
const job_queue_js_1 = require("../src/queue/job-queue.js");
// Mock BullMQ
globals_1.jest.mock('bullmq', () => {
    return {
        Queue: globals_1.jest.fn().mockImplementation(() => ({
            add: async () => ({
                id: 'mock-job-id',
                name: 'mock-job',
                data: {},
            }),
            close: async () => undefined,
        })),
        QueueEvents: globals_1.jest.fn().mockImplementation(() => ({
            on: () => { },
            close: async () => undefined,
            waitUntilReady: async () => undefined,
        })),
        QueueScheduler: globals_1.jest.fn().mockImplementation(() => ({
            close: async () => undefined,
            waitUntilReady: async () => undefined,
        })),
        Worker: globals_1.jest.fn().mockImplementation((name, processor) => ({
            on: () => { },
            close: async () => undefined,
            processor
        })),
        FlowProducer: globals_1.jest.fn().mockImplementation(() => ({
            add: async () => ({
                job: { id: 'flow-job-id' },
                children: [],
            }),
            close: async () => undefined,
        })),
    };
});
// Mock @bull-board/api
globals_1.jest.mock('@bull-board/api', () => ({
    createBullBoard: globals_1.jest.fn(),
}));
globals_1.jest.mock('@bull-board/api/bullMQAdapter', () => ({
    BullMQAdapter: globals_1.jest.fn(),
}));
globals_1.jest.mock('@bull-board/express', () => ({
    ExpressAdapter: globals_1.jest.fn().mockImplementation(() => ({
        setBasePath: globals_1.jest.fn(),
        getRouter: globals_1.jest.fn(),
    })),
}));
// Import after mocks
const worker_js_1 = require("../src/queue/worker.js");
// Mock retention engine
globals_1.jest.mock('../src/jobs/retention.js', () => ({
    retentionEngine: {
        purgeDataset: globals_1.jest.fn().mockResolvedValue(undefined),
    },
}));
(0, globals_1.describe)('Queue System', () => {
    const queue = new job_queue_js_1.JobQueue({
        name: types_js_1.QueueName.DEFAULT,
        connection: {},
    });
    beforeEach(async () => {
        const { Worker } = await Promise.resolve().then(() => __importStar(require('bullmq')));
        Worker.mockImplementation((name, processor) => ({
            on: () => { },
            close: async () => undefined,
            processor,
        }));
    });
    (0, globals_1.afterAll)(async () => {
        await queue.shutdown();
        await worker_js_1.workerManager.close();
    });
    (0, globals_1.it)('should add a job to the queue', async () => {
        const jobData = {
            type: 'test-job',
            payload: { foo: 'bar' },
        };
        const jobId = await queue.enqueue(jobData, { jobName: 'test-job-1' });
        (0, globals_1.expect)(jobId).toBe('mock-job-id');
    });
    (0, globals_1.it)('should register a worker', async () => {
        const processor = globals_1.jest.fn(async (job) => {
            return { result: job.data.payload.value * 2 };
        });
        worker_js_1.workerManager.registerWorker(types_js_1.QueueName.DEFAULT, processor);
        // Since we mocked Worker, we can't really test if it processes the job without simulating events
        // But we can verify that Worker was instantiated
        const { Worker } = await Promise.resolve().then(() => __importStar(require('bullmq')));
        (0, globals_1.expect)(Worker).toHaveBeenCalledWith(types_js_1.QueueName.DEFAULT, processor, globals_1.expect.any(Object));
    });
    (0, globals_1.it)('should schedule a job', async () => {
        const jobData = {
            type: 'scheduled-job',
            payload: { foo: 'bar' },
        };
        const scheduledId = await queue.schedule(jobData, {
            at: new Date(Date.now() + 1000),
            jobName: 'scheduled-job',
        });
        (0, globals_1.expect)(scheduledId).toBe('mock-job-id');
    });
});
