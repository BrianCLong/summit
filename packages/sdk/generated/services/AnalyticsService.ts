/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LinkPrediction } from '../models/LinkPrediction';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AnalyticsService {
    /**
     * Predict potential links
     * Predicts potential connections between the provided seed entities
     * @param seeds Comma separated entity IDs
     * @returns any Prediction results
     * @throws ApiError
     */
    public static getAnalyticsLinkPrediction(
        seeds: string,
    ): CancelablePromise<{
        items?: Array<LinkPrediction>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/analytics/link-prediction',
            query: {
                'seeds': seeds,
            },
        });
    }
}
