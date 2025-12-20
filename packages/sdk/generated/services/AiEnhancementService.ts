/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnalysisResult } from '../models/AnalysisResult';
import type { JobStatus } from '../models/JobStatus';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AiEnhancementService {
    /**
     * AI-powered graph analysis
     * Perform AI-enhanced analysis on graph data
     * @param requestBody
     * @returns AnalysisResult Analysis completed successfully
     * @returns any Analysis started, check status using job ID
     * @throws ApiError
     */
    public static postAiAnalyze(
        requestBody: {
            graphId: string;
            analysisType: 'community_detection' | 'centrality_analysis' | 'anomaly_detection' | 'pattern_recognition';
            parameters?: Record<string, any>;
        },
    ): CancelablePromise<AnalysisResult | {
        jobId?: string;
        status?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/ai/analyze',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Check AI job status
     * Get the status and results of an AI analysis job
     * @param jobId
     * @returns JobStatus Job status and results
     * @throws ApiError
     */
    public static getAiJobs(
        jobId: string,
    ): CancelablePromise<JobStatus> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/ai/jobs/{jobId}',
            path: {
                'jobId': jobId,
            },
        });
    }
}
