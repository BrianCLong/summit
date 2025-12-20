/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Collaborator } from '../models/Collaborator';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CollaborationService {
    /**
     * List graph collaborators
     * Get list of users with access to the graph
     * @param graphId
     * @returns Collaborator List of collaborators
     * @throws ApiError
     */
    public static getGraphsCollaborators(
        graphId: string,
    ): CancelablePromise<Array<Collaborator>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/graphs/{graphId}/collaborators',
            path: {
                'graphId': graphId,
            },
        });
    }
    /**
     * Add collaborator
     * Grant access to a user for the specified graph
     * @param graphId
     * @param requestBody
     * @returns Collaborator Collaborator added successfully
     * @throws ApiError
     */
    public static postGraphsCollaborators(
        graphId: string,
        requestBody: {
            userId: string;
            role: 'viewer' | 'editor' | 'admin';
        },
    ): CancelablePromise<Collaborator> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/graphs/{graphId}/collaborators',
            path: {
                'graphId': graphId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
