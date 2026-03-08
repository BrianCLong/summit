"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptWorker = void 0;
exports.buildSignedReceiptDraft = buildSignedReceiptDraft;
// @ts-nocheck
const provenance_1 = require("@intelgraph/provenance");
class ReceiptWorker {
    queue = [];
    dlq = [];
    maxAttempts;
    backpressureThreshold;
    handler;
    logger;
    processedCount = 0;
    failedCount = 0;
    dlqCount = 0;
    constructor(options = {}) {
        this.maxAttempts = options.maxAttempts ?? 3;
        this.backpressureThreshold = options.backpressureThreshold ?? 20;
        this.handler = options.handler ?? (async (job) => (0, provenance_1.signReceipt)(job.draft));
        this.logger =
            options.logger ??
                {
                    debug: () => { },
                    warn: () => { },
                    error: () => { },
                };
    }
    enqueue(job) {
        this.queue.push({ ...job, attempt: job.attempt ?? 0 });
        this.updateGauges();
    }
    getQueueLength() {
        return this.queue.length;
    }
    getDlqLength() {
        return this.dlq.length;
    }
    getMetricsSnapshot() {
        return {
            queue: this.queue.length,
            dlq: this.dlq.length,
            backpressure: this.queue.length >= this.backpressureThreshold,
            processed: this.processedCount,
            failed: this.failedCount,
        };
    }
    async tick() {
        const job = this.queue.shift();
        if (!job)
            return null;
        try {
            const receipt = await this.handler(job);
            this.processedCount += 1;
            this.logger.debug({ jobId: job.id, receiptId: receipt.id }, 'processed receipt job');
            return receipt;
        }
        catch (err) {
            job.attempt = (job.attempt ?? 0) + 1;
            this.failedCount += 1;
            this.logger.warn({ jobId: job.id, attempt: job.attempt, err }, 'receipt job failed');
            if (job.attempt >= this.maxAttempts) {
                this.dlq.push(job);
                this.dlqCount += 1;
                this.logger.error({ jobId: job.id }, 'receipt job moved to DLQ');
            }
            else {
                this.queue.push(job);
            }
        }
        finally {
            this.updateGauges();
        }
        return null;
    }
    async drain() {
        while (this.queue.length > 0) {
            await this.tick();
        }
    }
    updateGauges() {
        // no-op placeholder for future metrics integration
    }
}
exports.ReceiptWorker = ReceiptWorker;
function buildSignedReceiptDraft(overrides, signature) {
    return {
        id: overrides.id ?? 'job',
        caseId: overrides.caseId ?? 'case',
        claimIds: overrides.claimIds ?? ['claim'],
        createdAt: overrides.createdAt ?? new Date().toISOString(),
        actor: overrides.actor ?? { id: 'worker', role: 'system' },
        pipeline: overrides.pipeline,
        metadata: overrides.metadata,
        redactions: overrides.redactions,
        signature,
    };
}
