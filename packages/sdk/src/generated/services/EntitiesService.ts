/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateEntityRequest } from '../models/CreateEntityRequest';
import type { Entity } from '../models/Entity';
import type { Pagination } from '../models/Pagination';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class EntitiesService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * List entities in graph
   * Retrieve entities from the specified graph with filtering options
   * @returns any List of entities
   * @throws ApiError
   */
  public getGraphsEntities({
    graphId,
    type,
    search,
    page = 1,
    limit = 20,
  }: {
    graphId: string,
    type?: string,
    search?: string,
    page?: number,
    limit?: number,
  }): CancelablePromise<{
    data?: Array<Entity>;
    pagination?: Pagination;
  }> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/graphs/{graphId}/entities',
      path: {
        'graphId': graphId,
      },
      query: {
        'type': type,
        'search': search,
        'page': page,
        'limit': limit,
      },
    });
  }
  /**
   * Create entity
   * Create a new entity in the graph
   * @returns Entity Entity created successfully
   * @throws ApiError
   */
  public postGraphsEntities({
    graphId,
    requestBody,
  }: {
    graphId: string,
    requestBody: CreateEntityRequest,
  }): CancelablePromise<Entity> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/graphs/{graphId}/entities',
      path: {
        'graphId': graphId,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
}
