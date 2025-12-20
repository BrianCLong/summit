/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateGraphRequest } from '../models/CreateGraphRequest';
import type { Graph } from '../models/Graph';
import type { GraphSummary } from '../models/GraphSummary';
import type { Pagination } from '../models/Pagination';
import type { QueryResult } from '../models/QueryResult';
import type { UpdateGraphRequest } from '../models/UpdateGraphRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class GraphAnalyticsService {
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
    public static getGraphs(
        page: number = 1,
        limit: number = 20,
        search?: string,
        tags?: Array<string>,
    ): CancelablePromise<{
        data?: Array<GraphSummary>;
        pagination?: Pagination;
    }> {
        return __request(OpenAPI, {
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
    public static postGraphs(
        requestBody: CreateGraphRequest,
    ): CancelablePromise<Graph> {
        return __request(OpenAPI, {
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
    public static getGraphs1(
        graphId: string,
    ): CancelablePromise<Graph> {
        return __request(OpenAPI, {
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
    public static putGraphs(
        graphId: string,
        requestBody: UpdateGraphRequest,
    ): CancelablePromise<Graph> {
        return __request(OpenAPI, {
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
    public static deleteGraphs(
        graphId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
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
    public static postGraphsQuery(
        graphId: string,
        requestBody: {
            query: string;
            parameters?: Record<string, any>;
            includeMetrics?: boolean;
        },
    ): CancelablePromise<QueryResult> {
        return __request(OpenAPI, {
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
