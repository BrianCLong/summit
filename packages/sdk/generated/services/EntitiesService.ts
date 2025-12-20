/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateEntityRequest } from '../models/CreateEntityRequest';
import type { Entity } from '../models/Entity';
import type { Pagination } from '../models/Pagination';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EntitiesService {
    /**
     * List entities in graph
     * Retrieve entities from the specified graph with filtering options
     * @param graphId
     * @param type
     * @param search
     * @param page
     * @param limit
     * @returns any List of entities
     * @throws ApiError
     */
    public static getGraphsEntities(
        graphId: string,
        type?: string,
        search?: string,
        page: number = 1,
        limit: number = 20,
    ): CancelablePromise<{
        data?: Array<Entity>;
        pagination?: Pagination;
    }> {
        return __request(OpenAPI, {
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
     * @param graphId
     * @param requestBody
     * @returns Entity Entity created successfully
     * @throws ApiError
     */
    public static postGraphsEntities(
        graphId: string,
        requestBody: CreateEntityRequest,
    ): CancelablePromise<Entity> {
        return __request(OpenAPI, {
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
