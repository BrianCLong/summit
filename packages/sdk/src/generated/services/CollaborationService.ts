/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Collaborator } from '../models/Collaborator';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CollaborationService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * List graph collaborators
   * Get list of users with access to the graph
   * @returns Collaborator List of collaborators
   * @throws ApiError
   */
  public getGraphsCollaborators({
    graphId,
  }: {
    graphId: string,
  }): CancelablePromise<Array<Collaborator>> {
    return this.httpRequest.request({
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
   * @returns Collaborator Collaborator added successfully
   * @throws ApiError
   */
  public postGraphsCollaborators({
    graphId,
    requestBody,
  }: {
    graphId: string,
    requestBody: {
      userId: string;
      role: 'viewer' | 'editor' | 'admin';
    },
  }): CancelablePromise<Collaborator> {
    return this.httpRequest.request({
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
