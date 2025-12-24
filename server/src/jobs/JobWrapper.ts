
import { v4 as uuidv4 } from 'uuid';

export interface JobConfig {
  maxRetries: number;
  baseDelayMs: number;
}

export type JobHandler<T> = (data: T) => Promise<void>;

export class JobWrapper {
  private executedJobs = new Set<string>(); // Mock idempotency store

  constructor(
    private name: string,
    private config: JobConfig = { maxRetries: 3, baseDelayMs: 100 }
  ) {}

  async execute<T>(jobId: string, data: T, handler: JobHandler<T>): Promise<void> {
    // 1. Idempotency Check
    if (this.executedJobs.has(jobId)) {
      console.log(`[Job ${this.name}] Skipping duplicate job ${jobId}`);
      return;
    }

    // 2. Execution with Retries
    let attempt = 0;
    while (attempt <= this.config.maxRetries) {
      try {
        await handler(data);

        // Success
        this.executedJobs.add(jobId);
        return;
      } catch (err: any) {
        attempt++;
        // console.error(`[Job ${this.name}] Attempt ${attempt} failed: ${err.message}`);

        if (attempt > this.config.maxRetries) {
            // DLQ Logic would go here
            // console.error(`[Job ${this.name}] Moved to DLQ: ${jobId}`);
            throw new Error(`Job ${jobId} failed after ${attempt} attempts`);
        }

        // Exponential Backoff
        const delay = this.config.baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
