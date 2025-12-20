/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateGraphRequest } from '../models/CreateGraphRequest';
import type { Graph } from '../models/Graph';
import type { GraphExportJob } from '../models/GraphExportJob';
import type { GraphExportRequest } from '../models/GraphExportRequest';
import type { GraphInsightsResponse } from '../models/GraphInsightsResponse';
import type { GraphSummary } from '../models/GraphSummary';
import type { Pagination } from '../models/Pagination';
import type { QueryResult } from '../models/QueryResult';
import type { UpdateGraphRequest } from '../models/UpdateGraphRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class GraphAnalyticsService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * List user graphs
   * Retrieve list of graphs accessible to the current user
   * @returns any List of graphs
   * @throws ApiError
   */
  public getGraphs({
    page = 1,
    limit = 20,
    search,
    tags,
  }: {
    page?: number,
    limit?: number,
    /**
     * Search graphs by name or description
     */
    search?: string,
    /**
     * Filter by tags
     */
    tags?: Array<string>,
  }): CancelablePromise<{
    data?: Array<GraphSummary>;
    pagination?: Pagination;
  }> {
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
  public postGraphs({
    requestBody,
  }: {
    requestBody: CreateGraphRequest,
  }): CancelablePromise<Graph> {
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
  public getGraphs1({
    graphId,
  }: {
    graphId: string,
  }): CancelablePromise<Graph> {
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
  public putGraphs({
    graphId,
    requestBody,
  }: {
    graphId: string,
    requestBody: UpdateGraphRequest,
  }): CancelablePromise<Graph> {
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
  public deleteGraphs({
    graphId,
  }: {
    graphId: string,
  }): CancelablePromise<void> {
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
  public postGraphsQuery({
    graphId,
    requestBody,
  }: {
    graphId: string,
    requestBody: {
      query: string;
      parameters?: Record<string, any>;
      includeMetrics?: boolean;
    },
  }): CancelablePromise<QueryResult> {
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
  public getGraphsInsights({
    graphId,
    limit = 10,
    severity,
  }: {
    graphId: string,
    /**
     * Maximum number of insights to return
     */
    limit?: number,
    /**
     * Filter insights by severity
     */
    severity?: 'low' | 'medium' | 'high' | 'critical',
  }): CancelablePromise<GraphInsightsResponse> {
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
  public postGraphsExports({
    graphId,
    requestBody,
  }: {
    graphId: string,
    requestBody: GraphExportRequest,
  }): CancelablePromise<GraphExportJob> {
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
  public getGraphsExports({
    graphId,
    exportId,
  }: {
    graphId: string,
    exportId: string,
  }): CancelablePromise<GraphExportJob> {
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
