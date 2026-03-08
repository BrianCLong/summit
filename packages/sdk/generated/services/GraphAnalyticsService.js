"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphAnalyticsService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class GraphAnalyticsService {
    /**
     * List user graphs
     * Retrieve list of graphs accessible to the current user
     * @param page
     * @param limit
     * @param search Search graphs by name or description
     * @param tags Filter by tags
     * @returns any List of graphs
     * @throws ApiError
     */
    static getGraphs(page = 1, limit = 20, search, tags) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
     * @param requestBody
     * @returns Graph Graph created successfully
     * @throws ApiError
     */
    static postGraphs(requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
     * @param graphId
     * @returns Graph Graph details
     * @throws ApiError
     */
    static getGraphs1(graphId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
     * @param graphId
     * @param requestBody
     * @returns Graph Graph updated successfully
     * @throws ApiError
     */
    static putGraphs(graphId, requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
     * @param graphId
     * @returns void
     * @throws ApiError
     */
    static deleteGraphs(graphId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
     * @param graphId
     * @param requestBody
     * @returns QueryResult Query executed successfully
     * @throws ApiError
     */
    static postGraphsQuery(graphId, requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
}
exports.GraphAnalyticsService = GraphAnalyticsService;
