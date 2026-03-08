"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const index_js_1 = require("../observability/index.js");
const config_js_1 = require("../config.js");
const errors_js_1 = require("../lib/errors.js");
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500;
    const correlationId = req.correlationId;
    const traceId = req.traceId;
    // Emit metric
    index_js_1.metrics.incrementCounter('summit_errors_total', {
        code: statusCode.toString(),
        component: 'http.server',
        tenantId: req.user?.tenant_id || req.tenantId
    });
    // Structured error log using the new Observability Logger which auto-injects context
    // We explicitly pass err object for serialization
    index_js_1.logger.error(err.message, {
        err,
        stack: err.stack,
        path: req.path,
        method: req.method,
        statusCode,
    });
    // Response to client
    const response = {
        error: {
            message: 'Internal Server Error',
            correlationId,
            traceId,
        }
    };
    if (err instanceof errors_js_1.UserFacingError) {
        response.error.message = err.message;
        // UserFacingError might contain safe-to-expose details
    }
    else if (err instanceof errors_js_1.AppError) {
        // AppError logic if different
        if (statusCode < 500) {
            response.error.message = err.message;
        }
    }
    else if (config_js_1.cfg.NODE_ENV !== 'production') {
        // In non-production, expose full error details
        response.error.message = err.message;
        response.error.stack = err.stack;
        response.error.code = err.code;
    }
    else {
        // Production default: hide details for 500s
        if (statusCode < 500) {
            response.error.message = err.message;
        }
    }
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
