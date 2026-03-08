"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationshipsService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class RelationshipsService {
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
    static getGraphsRelationships(graphId, type, sourceId, targetId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
    static postGraphsRelationships(graphId, requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
