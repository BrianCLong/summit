"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationService = void 0;
class CollaborationService {
    httpRequest;
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * List graph collaborators
     * Get list of users with access to the graph
     * @returns Collaborator List of collaborators
     * @throws ApiError
     */
    getGraphsCollaborators({ graphId, }) {
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
    postGraphsCollaborators({ graphId, requestBody, }) {
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
exports.CollaborationService = CollaborationService;
