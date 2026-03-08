"use strict";
/**
 * Correlation ID Middleware
 * Adds correlation ID for request tracing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationId = correlationId;
const index_js_1 = require("../types/index.js");
function correlationId(req, res, next) {
    const id = req.headers['x-correlation-id'] || (0, index_js_1.generateId)();
    req.correlationId = id;
    res.setHeader('X-Correlation-Id', id);
    next();
}
