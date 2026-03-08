"use strict";
/**
 * Service Configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    opaUrl: process.env.OPA_URL || 'http://localhost:8181',
    logLevel: process.env.LOG_LEVEL || 'info',
    metricsEnabled: process.env.METRICS_ENABLED !== 'false',
    serviceName: process.env.SERVICE_NAME || 'companyos-service',
};
