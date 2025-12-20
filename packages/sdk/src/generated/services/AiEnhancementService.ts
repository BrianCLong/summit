/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnalysisResult } from '../models/AnalysisResult';
import type { JobStatus } from '../models/JobStatus';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AiEnhancementService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * AI-powered graph analysis
   * Perform AI-enhanced analysis on graph data
   * @returns AnalysisResult Analysis completed successfully
   * @returns any Analysis started, check status using job ID
   * @throws ApiError
   */
  public postAiAnalyze({
    requestBody,
  }: {
    requestBody: {
      graphId: string;
      analysisType: 'community_detection' | 'centrality_analysis' | 'anomaly_detection' | 'pattern_recognition';
      parameters?: Record<string, any>;
    },
  }): CancelablePromise<AnalysisResult | {
    jobId?: string;
    status?: string;
  }> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/ai/analyze',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Check AI job status
   * Get the status and results of an AI analysis job
   * @returns JobStatus Job status and results
   * @throws ApiError
   */
  public getAiJobs({
    jobId,
  }: {
    jobId: string,
  }): CancelablePromise<JobStatus> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/ai/jobs/{jobId}',
      path: {
        'jobId': jobId,
      },
    });
  }
}
