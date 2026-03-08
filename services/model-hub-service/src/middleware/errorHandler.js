"use strict";
/**
 * Express error handling middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
const logger_js_1 = require("../utils/logger.js");
const errors_js_1 = require("../utils/errors.js");
const zod_1 = require("zod");
function errorHandler(err, req, res, next) {
    logger_js_1.logger.error({
        message: 'Request error',
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    if (err instanceof errors_js_1.ModelHubError) {
        res.status(err.statusCode).json(err.toJSON());
        return;
    }
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: {
                name: 'ValidationError',
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                details: { issues: err.issues },
            },
        });
        return;
    }
    res.status(500).json({
        error: {
            name: 'InternalError',
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production'
                ? 'An internal error occurred'
                : err.message,
        },
    });
}
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
