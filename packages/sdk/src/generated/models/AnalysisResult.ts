/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GraphCoverage } from './GraphCoverage';
export type AnalysisResult = {
  jobId?: string;
  summary?: string;
  analysisType?: string;
  results?: Record<string, any>;
  insights?: Array<{
    type?: string;
    confidence?: number;
    description?: string;
  }>;
  coverage?: GraphCoverage;
  qualityScore?: number;
  executionTime?: number;
  createdAt?: string;
};

