"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class IngestService {
    /**
     * List ingest connectors
     * Returns connectors supported by the ingestion service
     * @returns any Connector catalog
     * @throws ApiError
     */
    static getIngestConnectors() {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/ingest/connectors',
        });
    }
    /**
     * Start ingest job
     * Starts a new ingest job using the specified connector configuration
     * @param requestBody
     * @returns any Job accepted
     * @throws ApiError
     */
    static postIngestStart(requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/ingest/start',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request`,
            },
        });
    }
    /**
     * Get ingest job progress
     * Returns progress for an ingest job
     * @param jobId
     * @returns IngestJob Job progress
     * @throws ApiError
     */
    static getIngestProgress(jobId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/ingest/progress/{jobId}',
            path: {
                'jobId': jobId,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Cancel ingest job
     * Cancels a queued or running ingest job
     * @param jobId
     * @returns any Cancelled
     * @throws ApiError
     */
    static postIngestCancel(jobId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/ingest/cancel/{jobId}',
            path: {
                'jobId': jobId,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Connector configuration schema
     * Returns JSON schema describing configuration fields for a connector
     * @param connectorId
     * @returns ConnectorSchema Connector schema
     * @throws ApiError
     */
    static getIngestSchema(connectorId) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/ingest/schema/{connectorId}',
            path: {
                'connectorId': connectorId,
            },
        });
    }
    /**
     * Validate connector configuration
     * Validates configuration without starting ingestion
     * @param connectorId
     * @param requestBody
     * @returns any Configuration valid
     * @throws ApiError
     */
    static postIngestDryRun(connectorId, requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/ingest/dry-run/{connectorId}',
            path: {
                'connectorId': connectorId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request`,
            },
        });
    }
}
exports.IngestService = IngestService;
