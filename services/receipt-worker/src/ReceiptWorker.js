"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptWorker = void 0;
const defaultConfig = {
    maxAttempts: 5,
    backoffMs: 250,
    backoffCapMs: 5_000,
    pollIntervalMs: 50,
};
class ReceiptWorker {
    queue;
    deadLetterQueue;
    handler;
    metrics;
    config;
    processing = false;
    poller;
    backoffTimers = new Set();
    constructor(options) {
        this.queue = options.queue;
        this.deadLetterQueue = options.deadLetterQueue;
        this.handler = options.handler;
        this.metrics = options.metrics;
        this.config = { ...defaultConfig, ...options.config };
    }
    start() {
        if (this.poller) {
            return;
        }
        this.poller = setInterval(() => this.processNext().catch((error) => this.logError(error)), this.config.pollIntervalMs);
    }
    stop() {
        if (this.poller) {
            clearInterval(this.poller);
            this.poller = undefined;
        }
        for (const timer of this.backoffTimers) {
            clearTimeout(timer);
        }
        this.backoffTimers.clear();
    }
    async processNext() {
        if (this.processing) {
            return;
        }
        const job = this.queue.dequeue();
        if (!job) {
            return;
        }
        this.processing = true;
        const startedAt = Date.now();
        try {
            this.metrics.observeLag((startedAt - job.firstEnqueuedAt) / 1000);
            await this.handler(job);
            this.metrics.recordSuccess();
        }
        catch (error) {
            await this.handleFailure(job, error);
        }
        finally {
            this.processing = false;
        }
    }
    async handleFailure(job, error) {
        const nextAttempt = job.attempts + 1;
        if (nextAttempt >= this.config.maxAttempts) {
            this.routeToDeadLetter(job, error);
            return;
        }
        const delay = Math.min(this.config.backoffMs * 2 ** (nextAttempt - 1), this.config.backoffCapMs);
        this.metrics.recordRetry();
        const timer = setTimeout(() => {
            this.backoffTimers.delete(timer);
            this.queue.enqueue({
                ...job,
                attempts: nextAttempt,
                enqueuedAt: Date.now(),
            });
        }, delay);
        this.backoffTimers.add(timer);
    }
    routeToDeadLetter(job, error) {
        this.deadLetterQueue.enqueue({
            ...job,
            attempts: job.attempts + 1,
            enqueuedAt: Date.now(),
            lastError: error.message,
        });
        this.metrics.recordDlq(this.deadLetterQueue.size());
    }
    logError(error) {
        // eslint-disable-next-line no-console
        console.error('[receipt-worker] error encountered', error);
    }
}
exports.ReceiptWorker = ReceiptWorker;
