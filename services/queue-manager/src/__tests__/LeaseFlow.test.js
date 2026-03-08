"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const QueueManager_js_1 = require("../core/QueueManager.js");
const errors_js_1 = require("../core/errors.js");
const mockQueues = {};
jest.mock('ioredis', () => {
    class FakeRedis {
        store = new Map();
        async set(key, value, _px, ttl, mode) {
            const existing = this.store.get(key);
            if (mode === 'NX' && existing)
                return null;
            if (mode === 'XX' && !existing)
                return null;
            this.store.set(key, { value, ttl, expires: Date.now() + ttl });
            return 'OK';
        }
        async eval(_script, _keys, key, expected) {
            const entry = this.store.get(key);
            if (entry?.value === expected) {
                this.store.delete(key);
                return 1;
            }
            return 0;
        }
        async quit() { }
    }
    return {
        __esModule: true,
        default: jest.fn(() => new FakeRedis()),
    };
});
jest.mock('bullmq', () => {
    class MockQueue {
        name;
        constructor(name) {
            this.name = name;
            mockQueues[this.name] = mockQueues[this.name] || [];
        }
        async add(name, data, opts = {}) {
            const queue = (mockQueues[this.name] = mockQueues[this.name] || []);
            const job = {
                id: opts.jobId || `${this.name}:${queue.length + 1}`,
                name,
                data,
                opts: { attempts: opts.attempts ?? 3, ...opts },
                attemptsMade: 0,
                queueName: this.name,
                remove: async () => {
                    mockQueues[this.name] = (mockQueues[this.name] || []).filter((j) => j.id !== job.id);
                },
            };
            queue.push(job);
            return job;
        }
        async addBulk(_jobs) {
            return [];
        }
        async getJob(id) {
            return (mockQueues[this.name] || []).find((job) => job.id === id);
        }
        async getJobs(_status, start, end) {
            return (mockQueues[this.name] || []).slice(start, end);
        }
        async getJobCounts() {
            return {
                waiting: (mockQueues[this.name] || []).length,
                active: 0,
                completed: 0,
                failed: 0,
                delayed: 0,
                paused: 0,
            };
        }
        async pause() { }
        async resume() { }
        async close() { }
        async obliterate() { }
        async clean() { }
    }
    class MockWorker {
        name;
        processor;
        opts;
        on = jest.fn();
        constructor(name, processor, opts) {
            this.name = name;
            this.processor = processor;
            this.opts = opts;
        }
        async close() { }
    }
    class MockQueueEvents {
        on = jest.fn();
        async close() { }
    }
    return {
        Queue: MockQueue,
        Worker: MockWorker,
        QueueEvents: MockQueueEvents,
    };
});
describe('QueueManager leasing + DLQ', () => {
    beforeEach(() => {
        process.env.LEASED_JOBS = '1';
        for (const key of Object.keys(mockQueues)) {
            mockQueues[key] = [];
        }
    });
    afterEach(async () => {
    });
    it('expires leases and treats the job as retryable when lease renewals fail', async () => {
        const queueManager = new QueueManager_js_1.QueueManager();
        queueManager.registerQueue('lease-queue');
        queueManager.leaseDurationMs = 20;
        queueManager.leaseRenewIntervalMs = 5;
        const leaseManager = queueManager.leaseManager;
        jest.spyOn(leaseManager, 'renew').mockResolvedValue(false);
        const wrapped = queueManager.buildProcessor('lease-queue', async () => {
            await new Promise((resolve) => setTimeout(resolve, 15));
        });
        const job = {
            id: 'lease-job-1',
            name: 'lease-job',
            data: {},
            queueName: 'lease-queue',
            opts: { attempts: 2 },
            attemptsMade: 0,
        };
        await expect(wrapped(job)).rejects.toBeInstanceOf(Error);
        const metrics = await queueManager.getQueueMetrics('lease-queue');
        expect(metrics.retries).toBe(1);
        expect(metrics.leaseExpirations).toBe(1);
        await queueManager.shutdown();
    });
    it('sends fatal errors to the dead-letter queue and allows requeue', async () => {
        const queueManager = new QueueManager_js_1.QueueManager();
        queueManager.registerQueue('work-queue');
        const wrapped = queueManager.buildProcessor('work-queue', async () => {
            throw new errors_js_1.FatalJobError('poison pill');
        });
        const job = {
            id: 'poison-1',
            name: 'poison',
            data: { payload: true },
            queueName: 'work-queue',
            opts: { attempts: 1 },
            attemptsMade: 0,
        };
        await expect(wrapped(job)).rejects.toBeInstanceOf(errors_js_1.FatalJobError);
        const dlqEntries = await queueManager.listDeadLetterJobs('poison');
        expect(dlqEntries).toHaveLength(1);
        const entry = dlqEntries[0];
        expect(entry.fatal).toBe(true);
        expect(entry.originalQueue).toBe('work-queue');
        const requeued = await queueManager.requeueFromDeadLetter(entry.jobId);
        expect(requeued.queueName).toBe('work-queue');
        const metrics = await queueManager.getQueueMetrics('work-queue');
        expect(metrics.deadLetters).toBe(1);
        expect(metrics.deadLetterRate).toBeGreaterThanOrEqual(0);
        await queueManager.shutdown();
    });
});
