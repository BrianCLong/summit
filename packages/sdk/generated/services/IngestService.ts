/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Connector } from '../models/Connector';
import type { ConnectorSchema } from '../models/ConnectorSchema';
import type { IngestJob } from '../models/IngestJob';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class IngestService {
    /**
     * List ingest connectors
     * Returns connectors supported by the ingestion service
     * @returns any Connector catalog
     * @throws ApiError
     */
    public static getIngestConnectors(): CancelablePromise<{
        items?: Array<Connector>;
    }> {
        return __request(OpenAPI, {
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
    public static postIngestStart(
        requestBody: {
            connector: string;
            config?: Record<string, any>;
        },
    ): CancelablePromise<{
        ok?: boolean;
        jobId?: string;
        connector?: string;
    }> {
        return __request(OpenAPI, {
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
    public static getIngestProgress(
        jobId: string,
    ): CancelablePromise<IngestJob> {
        return __request(OpenAPI, {
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
    public static postIngestCancel(
        jobId: string,
    ): CancelablePromise<{
        ok?: boolean;
        id?: string;
    }> {
        return __request(OpenAPI, {
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
    public static getIngestSchema(
        connectorId: string,
    ): CancelablePromise<ConnectorSchema> {
        return __request(OpenAPI, {
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
    public static postIngestDryRun(
        connectorId: string,
        requestBody: Record<string, any>,
    ): CancelablePromise<{
        ok?: boolean;
        warnings?: Array<string>;
    }> {
        return __request(OpenAPI, {
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
