export interface QueueJob {
  id?: string;
  payload: any;
  metadata?: Record<string, any>;
}

export interface EnqueueReceipt {
  jobId: string;
  timestamp: number;
}

export interface JobStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

export interface QueueProvider {
  enqueue(job: QueueJob): Promise<EnqueueReceipt>;
  getStatus(jobId: string): Promise<JobStatus>;
}
