"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorEnvelope = createErrorEnvelope;
exports.isErrorEnvelope = isErrorEnvelope;
const crypto_1 = require("crypto");
const errors_js_1 = require("./errors.js");
function createErrorEnvelope(domain, code, message, options = {}) {
    if (!code || !message) {
        throw new errors_js_1.ValidationError('Error envelope requires code and message');
    }
    const boundary = options.boundary ?? 'internal';
    const severity = options.severity ?? 'MEDIUM';
    const correlationId = options.correlationId ?? (0, crypto_1.randomUUID)();
    const retryable = options.retryable ?? false;
    return {
        code,
        message,
        domain,
        boundary,
        severity,
        correlationId,
        timestamp: new Date().toISOString(),
        retryable,
        cause: options.cause,
        details: options.details,
    };
}
function isErrorEnvelope(payload) {
    if (typeof payload !== 'object' || payload === null)
        return false;
    const candidate = payload;
    return Boolean(candidate.code &&
        candidate.message &&
        candidate.domain &&
        candidate.boundary &&
        candidate.severity &&
        candidate.correlationId &&
        candidate.timestamp);
}
