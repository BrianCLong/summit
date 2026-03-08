"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiEnhancementService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class AiEnhancementService {
    /**
     * AI-powered graph analysis
     * Perform AI-enhanced analysis on graph data
     * @param requestBody
     * @returns AnalysisResult Analysis completed successfully
     * @returns any Analysis started, check status using job ID
     * @throws ApiError
     */
    static postAiAnalyze(requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
    static getAiJobs(jobId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/ai/jobs/{jobId}',
            path: {
                'jobId': jobId,
            },
        });
    }
}
exports.AiEnhancementService = AiEnhancementService;
