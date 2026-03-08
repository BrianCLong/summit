"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntitiesService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class EntitiesService {
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
    static getGraphsEntities(graphId, type, search, page = 1, limit = 20) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
    static postGraphsEntities(graphId, requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
