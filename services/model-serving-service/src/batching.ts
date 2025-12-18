import type { InferenceRequest, InferenceResponse } from '@intelgraph/deep-learning-core';
import { RuntimeRouter } from './runtime.js';
import { ModelRegistry } from './registry.js';
import { BatchableRequest, OptimizationProfile, RuntimeConfig } from './types.js';

interface BatchQueue {
  requests: BatchableRequest[];
  timer?: NodeJS.Timeout;
  config: {
    maxBatchSize: number;
    maxWaitMs: number;
  };
  runtime: RuntimeConfig;
  optimization?: OptimizationProfile;
}

export class BatchProcessor {
  private queues = new Map<string, BatchQueue>();

  constructor(private runtimeRouter: RuntimeRouter, private registry: ModelRegistry) {}

  async enqueue(
    modelId: string,
    version: string,
    runtime: RuntimeConfig,
    request: InferenceRequest,
    optimization?: OptimizationProfile,
    abTestId?: string,
  ): Promise<InferenceResponse> {
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
      } else if (!queue.timer) {
        queue.timer = setTimeout(() => this.flush(queueKey), queue.config.maxWaitMs);
      }
    });
  }

  async processBatchRequests(
    requests: { modelId: string; version: string; runtime: RuntimeConfig; request: InferenceRequest; optimization?: OptimizationProfile }[],
  ): Promise<InferenceResponse[]> {
    return Promise.all(
      requests.map((item) =>
        this.enqueue(item.modelId, item.version, item.runtime, item.request, item.optimization),
      ),
    );
  }

  private async flush(queueKey: string): Promise<void> {
    const queue = this.queues.get(queueKey);
    if (!queue || queue.requests.length === 0) return;
    if (queue.timer) {
      clearTimeout(queue.timer);
      queue.timer = undefined;
    }

    const batch = queue.requests.splice(0, queue.config.maxBatchSize);
    const startTime = Date.now();

    try {
      const responses = await this.runtimeRouter.runBatch(
        batch[0].modelId,
        batch[0].version,
        queue.runtime,
        batch.map((entry) => entry.payload),
        queue.optimization,
      );

      const latency = Date.now() - startTime;
      batch.forEach((entry, index) => {
        const response = responses[index] || responses[responses.length - 1];
        entry.resolve(response);
        this.registry.recordOutcome(entry.modelId, entry.version, latency, true, entry.payload);
      });
    } catch (error) {
      batch.forEach((entry) => {
        entry.reject(error as Error);
        this.registry.recordOutcome(entry.modelId, entry.version, Date.now() - startTime, false, entry.payload);
      });
    }
  }

  private ensureQueue(queueKey: string, runtime: RuntimeConfig, optimization?: OptimizationProfile): BatchQueue {
    const existing = this.queues.get(queueKey);
    if (existing) return existing;

    const queue: BatchQueue = {
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
