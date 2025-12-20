/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateRelationshipRequest } from '../models/CreateRelationshipRequest';
import type { Relationship } from '../models/Relationship';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RelationshipsService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * List relationships in graph
   * Retrieve relationships from the specified graph
   * @returns Relationship List of relationships
   * @throws ApiError
   */
  public getGraphsRelationships({
    graphId,
    type,
    sourceId,
    targetId,
  }: {
    graphId: string,
    type?: string,
    sourceId?: string,
    targetId?: string,
  }): CancelablePromise<Array<Relationship>> {
    return this.httpRequest.request({
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
   * @returns Relationship Relationship created successfully
   * @throws ApiError
   */
  public postGraphsRelationships({
    graphId,
    requestBody,
  }: {
    graphId: string,
    requestBody: CreateRelationshipRequest,
  }): CancelablePromise<Relationship> {
    return this.httpRequest.request({
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
