/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GraphExportFilters } from './GraphExportFilters';
export type GraphExportJob = {
  exportId?: string;
  graphId?: string;
  status?: GraphExportJob.status;
  format?: GraphExportJob.format;
  createdAt?: string;
  completedAt?: string;
  downloadUrl?: string;
  expiresAt?: string;
  recordCount?: number;
  filters?: GraphExportFilters;
  message?: string;
};
export namespace GraphExportJob {
  export enum status {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
  }
  export enum format {
    CSV = 'csv',
    JSON = 'json',
    PARQUET = 'parquet',
  }
}

