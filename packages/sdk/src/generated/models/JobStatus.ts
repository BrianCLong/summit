/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnalysisResult } from './AnalysisResult';
export type JobStatus = {
  jobId?: string;
  status?: JobStatus.status;
  progress?: number;
  results?: AnalysisResult;
  error?: string;
  createdAt?: string;
  completedAt?: string;
};
export namespace JobStatus {
  export enum status {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
  }
}

