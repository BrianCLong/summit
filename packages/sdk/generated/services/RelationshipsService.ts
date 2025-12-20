/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateRelationshipRequest } from '../models/CreateRelationshipRequest';
import type { Relationship } from '../models/Relationship';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class RelationshipsService {
    /**
     * List relationships in graph
     * Retrieve relationships from the specified graph
     * @param graphId
     * @param type
     * @param sourceId
     * @param targetId
     * @returns Relationship List of relationships
     * @throws ApiError
     */
    public static getGraphsRelationships(
        graphId: string,
        type?: string,
        sourceId?: string,
        targetId?: string,
    ): CancelablePromise<Array<Relationship>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/graphs/{graphId}/relationships',
            path: {
                'graphId': graphId,
            },
            query: {
                'type': type,
                'sourceId': sourceId,
                'targetId': targetId,
            },
        });
    }
    /**
     * Create relationship
     * Create a new relationship between entities
     * @param graphId
     * @param requestBody
     * @returns any Relationship created successfully
     * @throws ApiError
     */
    public static postGraphsRelationships(
        graphId: string,
        requestBody: CreateRelationshipRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/graphs/{graphId}/relationships',
            path: {
                'graphId': graphId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
