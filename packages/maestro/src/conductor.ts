import { trace, Span, SpanStatusCode } from '@opentelemetry/api';

export interface Job {
  id: string;
  type: string;
  payload: unknown;
  priority: 0 | 1 | 2;
  retries?: number;
  timeoutMs?: number;
  handler: (payload: unknown) => Promise<unknown>;
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface JobResult {
  jobId: string;
  output: unknown;
  durationMs: number;
  attempt: number;
}

export class Conductor {
  private queue: Job[] = [];
  private statuses: Map<string, JobStatus> = new Map();
  private results: Map<string, JobResult> = new Map();
  private tracer = trace.getTracer('maestro-conductor');

  enqueue(job: Job): string {
    this.queue.push(job);
    this.queue.sort((a, b) => a.priority - b.priority);
    this.statuses.set(job.id, 'queued');
    return job.id;
  }

  async execute(jobId: string): Promise<JobResult> {
    const jobIndex = this.queue.findIndex(j => j.id === jobId);
    if (jobIndex === -1) {
      throw new Error(`Job ${jobId} not found in queue`);
    }

    const job = this.queue.splice(jobIndex, 1)[0];
    this.statuses.set(jobId, 'running');

    const maxRetries = job.retries ?? 3;
    const timeoutMs = job.timeoutMs ?? 5000;
    const startTime = Date.now();

    return this.tracer.startActiveSpan(`job.execute.${job.type}`, async (span: Span) => {
      span.setAttributes({
        'job.id': jobId,
        'job.type': job.type,
        'job.priority': job.priority,
      });

      let lastError: unknown;
      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          const output = await Promise.race([
            job.handler(job.payload),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), timeoutMs)
            ),
          ]);

          const result: JobResult = {
            jobId,
            output,
            durationMs: Date.now() - startTime,
            attempt
          };

          this.results.set(jobId, result);
          this.statuses.set(jobId, 'completed');
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return result;
        } catch (error: unknown) {
          lastError = error;
          const errorMessage = error instanceof Error ? error.message : String(error);
          span.addEvent('retry', { attempt, error: errorMessage });
          if (attempt <= maxRetries) {
            const delay = Math.pow(2, attempt) * 100;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
      }

      this.statuses.set(jobId, 'failed');
      const finalErrorMessage = lastError instanceof Error ? lastError.message : String(lastError);
      span.setStatus({ code: SpanStatusCode.ERROR, message: finalErrorMessage });
      if (lastError instanceof Error) {
        span.recordException(lastError);
      }
      span.end();
      throw lastError;
    });
  }

  getStatus(jobId: string): JobStatus | undefined {
    return this.statuses.get(jobId);
  }

  getResult(jobId: string): JobResult | undefined {
    return this.results.get(jobId);
  }
}
