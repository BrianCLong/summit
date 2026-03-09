export interface QueueJob {
  id: string;
  payload: Record<string, any>;
  retries?: number;
  metadata?: Record<string, any>;
}

export interface EnqueueReceipt {
  jobId: string;
  status: "enqueued" | "failed";
  enqueuedAt: number;
}

export interface JobStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
}

export interface QueueProvider {
  enqueue(job: QueueJob): Promise<EnqueueReceipt>;
  getStatus(jobId: string): Promise<JobStatus>;
}
