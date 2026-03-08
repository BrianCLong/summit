"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntitiesService = void 0;
class EntitiesService {
    httpRequest;
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * List entities in graph
     * Retrieve entities from the specified graph with filtering options
     * @returns any List of entities
     * @throws ApiError
     */
    getGraphsEntities({ graphId, type, search, page = 1, limit = 20, }) {
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
    postGraphsEntities({ graphId, requestBody, }) {
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
exports.EntitiesService = EntitiesService;
