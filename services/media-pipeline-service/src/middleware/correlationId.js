"use strict";
/**
 * Correlation ID Middleware
 *
 * Ensures every request has a correlation ID for tracing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationIdMiddleware = correlationIdMiddleware;
const hash_js_1 = require("../utils/hash.js");
async function correlationIdMiddleware(request, reply) {
    const correlationId = request.headers['x-correlation-id'] || (0, hash_js_1.generateId)();
    request.correlationId = correlationId;
    reply.header('X-Correlation-Id', correlationId);
}
