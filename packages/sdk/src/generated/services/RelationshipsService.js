"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationshipsService = void 0;
class RelationshipsService {
    httpRequest;
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * List relationships in graph
     * Retrieve relationships from the specified graph
     * @returns Relationship List of relationships
     * @throws ApiError
     */
    getGraphsRelationships({ graphId, type, sourceId, targetId, }) {
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
    postGraphsRelationships({ graphId, requestBody, }) {
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
exports.RelationshipsService = RelationshipsService;
