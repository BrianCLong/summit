/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnalysisResult } from './AnalysisResult';
export type JobStatus = {
    jobId?: string;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    results?: AnalysisResult;
    error?: string;
    createdAt?: string;
    completedAt?: string;
};

