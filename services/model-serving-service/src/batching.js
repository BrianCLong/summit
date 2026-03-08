"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchProcessor = void 0;
class BatchProcessor {
    runtimeRouter;
    registry;
    queues = new Map();
    constructor(runtimeRouter, registry) {
        this.runtimeRouter = runtimeRouter;
        this.registry = registry;
    }
    async enqueue(modelId, version, runtime, request, optimization, abTestId) {
        const queueKey = `${modelId}:${version}`;
        const queue = this.ensureQueue(queueKey, runtime, optimization);
        return new Promise((resolve, reject) => {
            queue.requests.push({
                modelId,
                version,
                payload: request,
                resolve,
                reject,
                enqueuedAt: Date.now(),
                abTestId,
            });
            if (queue.requests.length >= queue.config.maxBatchSize) {
                this.flush(queueKey);
            }
            else if (!queue.timer) {
                queue.timer = setTimeout(() => this.flush(queueKey), queue.config.maxWaitMs);
            }
        });
    }
    async processBatchRequests(requests) {
        return Promise.all(requests.map((item) => this.enqueue(item.modelId, item.version, item.runtime, item.request, item.optimization)));
    }
    async flush(queueKey) {
        const queue = this.queues.get(queueKey);
        if (!queue || queue.requests.length === 0)
            return;
        if (queue.timer) {
            clearTimeout(queue.timer);
            queue.timer = undefined;
        }
        const batch = queue.requests.splice(0, queue.config.maxBatchSize);
        const startTime = Date.now();
        try {
            const responses = await this.runtimeRouter.runBatch(batch[0].modelId, batch[0].version, queue.runtime, batch.map((entry) => entry.payload), queue.optimization);
            const latency = Date.now() - startTime;
            batch.forEach((entry, index) => {
                const response = responses[index] || responses[responses.length - 1];
                entry.resolve(response);
                this.registry.recordOutcome(entry.modelId, entry.version, latency, true, entry.payload);
            });
        }
        catch (error) {
            batch.forEach((entry) => {
                entry.reject(error);
                this.registry.recordOutcome(entry.modelId, entry.version, Date.now() - startTime, false, entry.payload);
            });
        }
    }
    ensureQueue(queueKey, runtime, optimization) {
        const existing = this.queues.get(queueKey);
        if (existing)
            return existing;
        const queue = {
            requests: [],
            config: {
                maxBatchSize: optimization?.preferBatching ? 64 : 32,
                maxWaitMs: optimization?.targetLatencyMs ? Math.min(optimization.targetLatencyMs, 100) : 50,
            },
            runtime,
            optimization,
        };
        this.queues.set(queueKey, queue);
        return queue;
    }
}
exports.BatchProcessor = BatchProcessor;
