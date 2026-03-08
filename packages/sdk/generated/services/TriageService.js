"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriageService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class TriageService {
    /**
     * List triage suggestions
     * Retrieves AI-generated suggestions in reverse chronological order
     * @returns any Suggestion list
     * @throws ApiError
     */
    static getTriageSuggestions() {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/triage/suggestions',
        });
    }
    /**
     * Create triage suggestion
     * Creates a new triage suggestion
     * @param requestBody
     * @returns any Suggestion created
     * @throws ApiError
     */
    static postTriageSuggestions(requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/triage/suggestions',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Approve suggestion
     * Approves the suggestion and marks it as ready to materialize
     * @param suggestionId
     * @returns any Suggestion approved
     * @throws ApiError
     */
    static postTriageSuggestionsApprove(suggestionId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/triage/suggestions/{suggestionId}/approve',
            path: {
                'suggestionId': suggestionId,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Materialize suggestion
     * Applies an approved suggestion to the graph
     * @param suggestionId
     * @returns any Suggestion materialized
     * @throws ApiError
     */
    static postTriageSuggestionsMaterialize(suggestionId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/triage/suggestions/{suggestionId}/materialize',
            path: {
                'suggestionId': suggestionId,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
}
exports.TriageService = TriageService;
