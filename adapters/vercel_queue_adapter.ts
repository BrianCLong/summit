import { QueueProvider, QueueJob, EnqueueReceipt, JobStatus } from "../core/queue/provider";
import * as crypto from "crypto";

export class VercelQueueAdapter implements QueueProvider {
  private executionCounter = 0;

  constructor(private readonly queueName: string) {}

  async enqueue(job: QueueJob): Promise<EnqueueReceipt> {
    this.executionCounter++;

    // Deterministic ID generation using sha256 hash of payload
    const payloadString =
      typeof job.payload === "string" ? job.payload : JSON.stringify(job.payload || {});
    const hash = crypto.createHash("sha256").update(payloadString).digest("hex");
    const jobId = job.id || `EVID-ASYNC-${hash}`;

    // Deterministic timestamp (use a static baseline + counter for predictable execution tests)
    const timestamp = 1769811200000 + this.executionCounter;

    console.log(`[VercelQueueAdapter] Enqueuing job ${jobId} to queue ${this.queueName}`);

    return {
      jobId,
      timestamp,
    };
  }

  async getStatus(jobId: string): Promise<JobStatus> {
    console.log(`[VercelQueueAdapter] Getting status for job ${jobId} in queue ${this.queueName}`);

    return {
      id: jobId,
      status: "pending", // Static deterministic response for now
    };
  }
}
