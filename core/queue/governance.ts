import * as crypto from "crypto";

import { QueueJob, QueueProvider, EnqueueReceipt } from "./provider";

export interface GovernanceConfig {
  maxRetries: number;
  maxCostPerJob: number;
}

export class GovernedQueueProvider implements QueueProvider {
  private baseProvider: QueueProvider;
  private config: GovernanceConfig;

  constructor(baseProvider: QueueProvider, config: GovernanceConfig) {
    this.baseProvider = baseProvider;
    this.config = config;
  }

  private hashPayload(payload: any): string {
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }

  enqueue(job: QueueJob): Promise<EnqueueReceipt> {
    if ((job.retries || 0) > this.config.maxRetries) {
      throw new Error(`Retry cap hit. Max retries: ${this.config.maxRetries}`);
    }

    const payloadCost = this.estimateCost(job.payload);
    if (payloadCost > this.config.maxCostPerJob) {
      throw new Error(`Cost budget exceeded: ${payloadCost} > ${this.config.maxCostPerJob}`);
    }

    const idempotencyKey = `EVID-ASYNC-${this.hashPayload(job.payload)}`;
    // Inject idempotency key if supported by the provider, else rely on this wrapper
    job.metadata = { ...job.metadata, idempotencyKey };

    return this.baseProvider.enqueue(job);
  }

  getStatus(jobId: string) {
    return this.baseProvider.getStatus(jobId);
  }

  private estimateCost(payload: any): number {
    // Basic stub logic: $.001 per KB of payload
    const bytes = Buffer.byteLength(JSON.stringify(payload));
    return (bytes / 1024) * 0.001;
  }
}
