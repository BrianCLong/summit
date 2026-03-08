"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const globals_1 = require("@jest/globals");
const job_queue_js_1 = require("../job-queue.js");
const mockState = {
    queues: new Map(),
    workers: [],
};
globals_1.jest.mock('bullmq', () => {
    class MockQueue {
        name;
        jobs = new Map();
        getJobCounts = globals_1.jest.fn(async () => ({
            waiting: [...this.jobs.values()].filter((job) => job.state !== 'failed').length,
            active: 0,
            completed: [...this.jobs.values()].filter((job) => job.state === 'completed').length,
            failed: [...this.jobs.values()].filter((job) => job.state === 'failed').length,
            delayed: [...this.jobs.values()].filter((job) => Boolean(job.opts.delay)).length,
        }));
        add = globals_1.jest.fn(async (jobName, data, opts = {}) => {
            const job = {
                id: opts.jobId ?? `${jobName}-${this.jobs.size + 1}`,
                name: jobName,
                data,
                opts,
                attemptsMade: opts.attemptsMade ?? 0,
                timestamp: Date.now(),
                progress: 0,
                getState: async () => job.state ?? 'waiting',
                progressValue: async () => job.progress,
            };
            this.jobs.set(job.id, job);
            return job;
        });
        constructor(name) {
            this.name = name;
            mockState.queues.set(name, this);
        }
        async getJob(id) {
            return this.jobs.get(id) ?? null;
        }
        async getWaitingCount() {
            return [...this.jobs.values()].filter((job) => job.state !== 'failed').length;
        }
        async getActiveCount() {
            return 0;
        }
        async getCompletedCount() {
            return 0;
        }
        async getFailedCount() {
            return [...this.jobs.values()].filter((job) => job.state === 'failed').length;
        }
        async getDelayedCount() {
            return [...this.jobs.values()].filter((job) => Boolean(job.opts.delay)).length;
        }
        async pause() { }
        async resume() { }
        async close() { }
    }
    class MockQueueEvents extends events_1.EventEmitter {
        async waitUntilReady() { }
        async close() { }
    }
    class MockQueueScheduler {
        constructor() { }
        async waitUntilReady() { }
        async close() { }
    }
    class MockWorker extends events_1.EventEmitter {
        name;
        processor;
        constructor(name, processor) {
            super();
            this.name = name;
            this.processor = processor;
            mockState.workers.push(this);
        }
        async pause() { }
        async resume() { }
        async close() { }
    }
    return {
        Queue: MockQueue,
        QueueEvents: MockQueueEvents,
        QueueScheduler: MockQueueScheduler,
        Worker: MockWorker,
    };
});
globals_1.jest.mock('../../db/redis', () => ({
    getRedisClient: globals_1.jest.fn(() => ({
        on: globals_1.jest.fn(),
        quit: globals_1.jest.fn(),
    })),
}));
const getMockQueue = (name) => mockState.queues.get(name);
describe('JobQueue', () => {
    beforeEach(() => {
        mockState.queues.clear();
        mockState.workers.length = 0;
    });
    it('enqueues jobs with priority, retry, and delay options', async () => {
        const queue = new job_queue_js_1.JobQueue({
            name: 'priority-queue',
            deadLetterQueueName: 'priority-dlq',
        });
        const jobId = await queue.enqueue({ task: 'compute' }, {
            priority: 1,
            attempts: 4,
            delay: 1500,
            backoff: { type: 'exponential', delay: 500 },
        });
        const mockQueue = getMockQueue('priority-queue');
        const storedJob = mockQueue.jobs.get(jobId);
        expect(storedJob.opts.priority).toBe(1);
        expect(storedJob.opts.attempts).toBe(4);
        expect(storedJob.opts.delay).toBe(1500);
        expect(storedJob.opts.backoff).toEqual({ type: 'exponential', delay: 500 });
    });
    it('routes exhausted jobs to a dead-letter queue', async () => {
        const queue = new job_queue_js_1.JobQueue({
            name: 'retry-queue',
            deadLetterQueueName: 'retry-dlq',
        });
        await queue.start(async () => {
            throw new Error('boom');
        });
        const jobId = await queue.enqueue({ task: 'explode' }, { attempts: 2 });
        const mainQueue = getMockQueue('retry-queue');
        const worker = mockState.workers[0];
        const failedJob = mainQueue.jobs.get(jobId);
        failedJob.attemptsMade = 2;
        worker.emit('failed', failedJob, new Error('boom'));
        const deadLetterQueue = getMockQueue('retry-dlq');
        expect(deadLetterQueue.add).toHaveBeenCalledWith('retry-queue:dead-letter', expect.any(Object));
    });
    it('supports scheduling with future timestamps', async () => {
        const queue = new job_queue_js_1.JobQueue({ name: 'scheduled-queue' });
        const future = new Date(Date.now() + 5000);
        const jobId = await queue.schedule({ task: 'later' }, { at: future, priority: 3 });
        const mockQueue = getMockQueue('scheduled-queue');
        const storedJob = mockQueue.jobs.get(jobId);
        expect(storedJob.opts.delay).toBeGreaterThanOrEqual(0);
        expect(storedJob.opts.priority).toBe(3);
    });
    it('forwards progress updates from workers', async () => {
        const queue = new job_queue_js_1.JobQueue({ name: 'progress-queue' });
        await queue.start(async () => 'ok');
        const jobId = await queue.enqueue({ task: 'run' });
        const worker = mockState.workers[0];
        const job = getMockQueue('progress-queue').jobs.get(jobId);
        const listener = globals_1.jest.fn();
        const unsubscribe = queue.onProgress(listener);
        worker.emit('progress', job, 42);
        expect(listener).toHaveBeenCalledWith({ jobId, progress: 42 });
        unsubscribe();
    });
    it('waits for schedulers to be ready and exposes metrics and job details', async () => {
        const queue = new job_queue_js_1.JobQueue({ name: 'metrics-queue' });
        await queue.start(async (job) => {
            job.progress = 50;
            job.returnvalue = 'done';
            job.state = 'completed';
            return 'done';
        });
        const jobId = await queue.enqueue({ task: 'count' }, { delay: 10 });
        const mockQueue = getMockQueue('metrics-queue');
        const storedJob = mockQueue.jobs.get(jobId);
        storedJob.state = 'completed';
        storedJob.finishedOn = Date.now();
        const metrics = await queue.metrics();
        expect(metrics.waiting).toBe(1);
        expect(metrics.delayed).toBe(1);
        const details = await queue.getJobDetails(jobId);
        expect(details).toMatchObject({
            id: jobId,
            progress: 0,
            returnValue: undefined,
            state: 'completed',
        });
    });
});
