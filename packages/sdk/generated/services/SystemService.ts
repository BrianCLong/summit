/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HealthStatus } from '../models/HealthStatus';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SystemService {
    /**
     * Health check
     * System health status
     * @returns HealthStatus System is healthy
     * @throws ApiError
     */
    public static getHealth(): CancelablePromise<HealthStatus> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health',
        });
    }
    /**
     * System metrics
     * Prometheus-compatible metrics endpoint
     * @returns string Metrics data
     * @throws ApiError
     */
    public static getMetrics(): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/metrics',
        });
    }
}
