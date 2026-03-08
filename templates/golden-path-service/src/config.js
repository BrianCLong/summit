"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const toBoolean = (value, defaultValue) => {
    if (value === undefined)
        return defaultValue;
    return value.toLowerCase() === 'true';
};
const toNumber = (value, fallback) => {
    const parsed = Number(value ?? fallback);
    if (Number.isNaN(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
};
exports.config = {
    serviceName: process.env.SERVICE_NAME || 'golden-path-service',
    port: toNumber(process.env.PORT, 3000),
    logLevel: process.env.LOG_LEVEL || 'info',
    metricsEnabled: toBoolean(process.env.METRICS_ENABLED, true),
    tracingEnabled: toBoolean(process.env.TRACING_ENABLED, true),
    policyEndpoint: process.env.POLICY_ENDPOINT || 'http://localhost:8181/v1/data/companyos/authz/allow',
    featureFlagSecureApproval: toBoolean(process.env.FEATURE_FLAG_SECURE_APPROVAL, true)
};
