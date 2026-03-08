"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptWorker = void 0;
// @ts-nocheck
const pino_1 = __importDefault(require("pino"));
class ReceiptWorker {
    processor;
    maxAttempts;
    backpressureThreshold;
    logger;
    queue = [];
    dlq = [];
    processing = false;
    metrics = {
        queueDepth: 0,
        dlqDepth: 0,
        processed: 0,
        failed: 0,
        backpressure: false,
    };
    constructor(processor, options = {}) {
        this.processor = processor;
        this.maxAttempts = options.maxAttempts ?? 3;
        this.backpressureThreshold = options.backpressureThreshold ?? 50;
        this.logger = options.logger ?? (0, pino_1.default)({ name: 'receipt-worker' });
    }
    enqueue(job) {
        this.queue.push({ ...job, attempts: job.attempts ?? 0 });
        this.updateMetrics();
        this.maybeProcess();
    }
    metricsSnapshot() {
        return { ...this.metrics };
    }
    updateMetrics() {
        this.metrics = {
            ...this.metrics,
            queueDepth: this.queue.length,
            dlqDepth: this.dlq.length,
            backpressure: this.queue.length >= this.backpressureThreshold,
        };
    }
    maybeProcess() {
        if (this.processing)
            return;
        this.processing = true;
        setImmediate(() => this.drain());
    }
    async drain() {
        while (this.queue.length > 0) {
            const job = this.queue.shift();
            try {
                await this.processor(job.receipt);
                this.metrics.processed += 1;
            }
            catch (err) {
                const attempts = (job.attempts ?? 0) + 1;
                if (attempts >= this.maxAttempts) {
                    this.logger.error({ id: job.id, err }, 'job moved to DLQ');
                    this.metrics.failed += 1;
                    this.dlq.push({ ...job, attempts });
                }
                else {
                    this.logger.warn({ id: job.id, attempts }, 'retrying receipt job');
                    this.queue.push({ ...job, attempts });
                }
            }
            this.updateMetrics();
        }
        this.processing = false;
    }
}
exports.ReceiptWorker = ReceiptWorker;
