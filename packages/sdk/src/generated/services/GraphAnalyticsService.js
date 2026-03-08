"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphAnalyticsService = void 0;
class GraphAnalyticsService {
    httpRequest;
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * List user graphs
     * Retrieve list of graphs accessible to the current user
     * @returns any List of graphs
     * @throws ApiError
     */
    getGraphs({ page = 1, limit = 20, search, tags, }) {
        return this.httpRequest.request({
            method: 'GET',
            url: '/graphs',
            query: {
                'page': page,
                'limit': limit,
                'search': search,
                'tags': tags,
            },
        });
    }
    /**
     * Create new graph
     * Create a new intelligence graph for analysis
     * @returns Graph Graph created successfully
     * @throws ApiError
     */
    postGraphs({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/graphs',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation error in request data`,
            },
        });
    }
    /**
     * Get graph details
     * Retrieve detailed information about a specific graph
     * @returns Graph Graph details
     * @throws ApiError
     */
    getGraphs1({ graphId, }) {
        return this.httpRequest.request({
            method: 'GET',
            url: '/graphs/{graphId}',
            path: {
                'graphId': graphId,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Update graph
     * Update graph metadata and configuration
     * @returns Graph Graph updated successfully
     * @throws ApiError
     */
    putGraphs({ graphId, requestBody, }) {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/graphs/{graphId}',
            path: {
                'graphId': graphId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Resource not found`,
                422: `Validation error in request data`,
            },
        });
    }
    /**
     * Delete graph
     * Permanently delete a graph and all associated data
     * @returns void
     * @throws ApiError
     */
    deleteGraphs({ graphId, }) {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/graphs/{graphId}',
            path: {
                'graphId': graphId,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Execute graph query
     * Execute Cypher query against the graph database
     * @returns QueryResult Query executed successfully
     * @throws ApiError
     */
    postGraphsQuery({ graphId, requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/graphs/{graphId}/query',
            path: {
                'graphId': graphId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request`,
                404: `Resource not found`,
            },
        });
    }
    /**
     * Get AI insights for graph
     * Retrieve the latest AI-generated insights, risks, and coverage metrics for a graph
     * @returns GraphInsightsResponse Graph insights retrieved
     * @throws ApiError
     */
    getGraphsInsights({ graphId, limit = 10, severity, }) {
        return this.httpRequest.request({
            method: 'GET',
            url: '/graphs/{graphId}/insights',
            path: {
                'graphId': graphId,
            },
            query: {
                'limit': limit,
                'severity': severity,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Request graph export
     * Export graph data as a file with optional filters
     * @returns GraphExportJob Export job accepted
     * @throws ApiError
     */
    postGraphsExports({ graphId, requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/graphs/{graphId}/exports',
            path: {
                'graphId': graphId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Get graph export status
     * Retrieve the status and download link for a graph export job
     * @returns GraphExportJob Export job status
     * @throws ApiError
     */
    getGraphsExports({ graphId, exportId, }) {
        return this.httpRequest.request({
            method: 'GET',
            url: '/graphs/{graphId}/exports/{exportId}',
            path: {
                'graphId': graphId,
                'exportId': exportId,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
}
exports.GraphAnalyticsService = GraphAnalyticsService;
