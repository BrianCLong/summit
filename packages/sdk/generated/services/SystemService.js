"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class SystemService {
    /**
     * Health check
     * System health status
     * @returns HealthStatus System is healthy
     * @throws ApiError
     */
    static getHealth() {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
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
    static getMetrics() {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'GET',
            url: '/metrics',
        });
    }
}
exports.SystemService = SystemService;
