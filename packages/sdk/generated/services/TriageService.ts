/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Suggestion } from '../models/Suggestion';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TriageService {
    /**
     * List triage suggestions
     * Retrieves AI-generated suggestions in reverse chronological order
     * @returns any Suggestion list
     * @throws ApiError
     */
    public static getTriageSuggestions(): CancelablePromise<{
        items?: Array<Suggestion>;
    }> {
        return __request(OpenAPI, {
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
    public static postTriageSuggestions(
        requestBody: {
            type?: 'link' | 'anomaly';
            data?: Record<string, any>;
        },
    ): CancelablePromise<{
        ok?: boolean;
        suggestion?: Suggestion;
    }> {
        return __request(OpenAPI, {
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
    public static postTriageSuggestionsApprove(
        suggestionId: string,
    ): CancelablePromise<{
        ok?: boolean;
        suggestion?: Suggestion;
    }> {
        return __request(OpenAPI, {
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
    public static postTriageSuggestionsMaterialize(
        suggestionId: string,
    ): CancelablePromise<{
        ok?: boolean;
        suggestion?: Suggestion;
    }> {
        return __request(OpenAPI, {
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
