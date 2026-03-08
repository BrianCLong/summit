"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class AnalyticsService {
    /**
     * Predict potential links
     * Predicts potential connections between the provided seed entities
     * @param seeds Comma separated entity IDs
     * @returns any Prediction results
     * @throws ApiError
     */
    static getAnalyticsLinkPrediction(seeds) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/analytics/link-prediction',
            query: {
                'seeds': seeds,
            },
        });
    }
}
exports.AnalyticsService = AnalyticsService;
