"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class CollaborationService {
    /**
     * List graph collaborators
     * Get list of users with access to the graph
     * @param graphId
     * @returns Collaborator List of collaborators
     * @throws ApiError
     */
    static getGraphsCollaborators(graphId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
    static postGraphsCollaborators(graphId, requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
exports.CollaborationService = CollaborationService;
