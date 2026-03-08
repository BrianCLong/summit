"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemService = void 0;
class SystemService {
    httpRequest;
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * Health check
     * System health status
     * @returns HealthStatus System is healthy
     * @throws ApiError
     */
    getHealth() {
        return this.httpRequest.request({
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
    getMetrics() {
        return this.httpRequest.request({
            method: 'GET',
            url: '/metrics',
        });
    }
}
exports.SystemService = SystemService;
