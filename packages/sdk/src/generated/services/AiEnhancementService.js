"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiEnhancementService = void 0;
class AiEnhancementService {
    httpRequest;
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * AI-powered graph analysis
     * Perform AI-enhanced analysis on graph data
     * @returns AnalysisResult Analysis completed successfully
     * @returns any Analysis started, check status using job ID
     * @throws ApiError
     */
    postAiAnalyze({ requestBody, }) {
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
    getAiJobs({ jobId, }) {
        return this.httpRequest.request({
            method: 'GET',
            url: '/ai/jobs/{jobId}',
            path: {
                'jobId': jobId,
            },
        });
    }
}
exports.AiEnhancementService = AiEnhancementService;
