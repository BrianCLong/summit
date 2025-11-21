import { Job, JobsOptions } from 'bullmq';

export enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  BACKGROUND = 5,
}

export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
}

export interface JobMetadata {
  createdBy?: string;
  correlationId?: string;
  tags?: string[];
  retryCount?: number;
  maxRetries?: number;
}

export interface QueueJobOptions extends JobsOptions {
  priority?: JobPriority;
  scheduledAt?: Date;
  metadata?: JobMetadata;
  chainTo?: {
    queueName: string;
    jobName: string;
    data?: any;
  }[];
}

export interface WorkflowStep {
  queueName: string;
  jobName: string;
  data: any;
  options?: QueueJobOptions;
  onSuccess?: WorkflowStep[];
  onFailure?: WorkflowStep[];
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  metadata?: JobMetadata;
}

export interface QueueMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  throughput: number; // jobs per minute
  avgProcessingTime: number; // ms
  errorRate: number; // percentage
}

export interface JobResult {
  jobId: string;
  queueName: string;
  status: JobStatus;
  data?: any;
  error?: string;
  processingTime?: number;
  completedAt?: Date;
}

export interface DeadLetterJobData {
  originalQueue: string;
  originalJobId: string;
  originalData: any;
  failureReason: string;
  failedAt: Date;
  attemptsMade: number;
}
