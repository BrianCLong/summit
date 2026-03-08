"use strict";
/**
 * Error Handler Middleware
 * Centralized error handling for the KB service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
exports.createError = createError;
const zod_1 = require("zod");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'kb-service' });
function errorHandler(err, req, res, _next) {
    // Log the error
    logger.error({
        err,
        method: req.method,
        url: req.url,
        body: req.body,
    });
    // Handle Zod validation errors
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                details: err.errors.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                })),
            },
        });
        return;
    }
    // Handle known errors
    if (err.statusCode) {
        res.status(err.statusCode).json({
            error: {
                code: err.code || 'ERROR',
                message: err.message,
            },
        });
        return;
    }
    // Handle specific error messages
    if (err.message.includes('not found')) {
        res.status(404).json({
            error: {
                code: 'NOT_FOUND',
                message: err.message,
            },
        });
        return;
    }
    if (err.message.includes('Only')) {
        res.status(403).json({
            error: {
                code: 'FORBIDDEN',
                message: err.message,
            },
        });
        return;
    }
    if (err.message.includes('cannot be') || err.message.includes('Invalid')) {
        res.status(400).json({
            error: {
                code: 'BAD_REQUEST',
                message: err.message,
            },
        });
        return;
    }
    // Default to 500 Internal Server Error
    const statusCode = 500;
    res.status(statusCode).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production'
                ? 'An unexpected error occurred'
                : err.message,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
        },
    });
}
/**
 * Not Found Handler
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
    });
}
/**
 * Create a custom API error
 */
function createError(message, statusCode, code) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}
