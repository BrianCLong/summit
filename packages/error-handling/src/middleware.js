"use strict";
/**
 * Error Handling Middleware for Express and GraphQL
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
exports.formatGraphQLError = formatGraphQLError;
exports.createGraphQLErrorFormatter = createGraphQLErrorFormatter;
exports.notFoundHandler = notFoundHandler;
exports.correlationIdMiddleware = correlationIdMiddleware;
exports.errorRecoveryMiddleware = errorRecoveryMiddleware;
const pino_1 = __importDefault(require("pino"));
const errors_js_1 = require("./errors.js");
const logger = (0, pino_1.default)({ name: 'ErrorMiddleware' });
/**
 * Express error handling middleware
 * Should be added as the last middleware in the chain
 */
function errorHandler(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) {
    const appError = (0, errors_js_1.toAppError)(err);
    const isProduction = process.env.NODE_ENV === 'production';
    // Log error with context
    const logContext = {
        error: appError.toJSON(),
        request: {
            method: req.method,
            url: req.url,
            path: req.path,
            query: req.query,
            params: req.params,
            headers: {
                'user-agent': req.headers['user-agent'],
                'content-type': req.headers['content-type'],
            },
            ip: req.ip,
            correlationId: req.headers['x-correlation-id'] || req.headers['x-request-id'],
        },
    };
    if (appError.httpStatus >= 500) {
        logger.error(logContext, 'Server error occurred');
    }
    else {
        logger.warn(logContext, 'Client error occurred');
    }
    // Send error response
    const errorResponse = (0, errors_js_1.sanitizeError)(appError, isProduction);
    res.status(appError.httpStatus).json({
        ...errorResponse.error,
        requestId: req.headers['x-request-id'],
        path: req.path,
    });
}
/**
 * Async error wrapper for Express route handlers
 * Automatically catches async errors and passes to error middleware
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
/**
 * GraphQL error formatter
 * Converts errors to standardized format
 */
function formatGraphQLError(error, isProduction = process.env.NODE_ENV === 'production') {
    // Extract original error
    const originalError = error.originalError;
    // Convert to AppError if not already
    const appError = originalError instanceof errors_js_1.AppError
        ? originalError
        : (0, errors_js_1.toAppError)(originalError || error);
    // Log error
    const logContext = {
        error: appError.toJSON(),
        graphql: {
            path: error.path,
            locations: error.locations,
            extensions: error.extensions,
        },
    };
    if (appError.httpStatus >= 500) {
        logger.error(logContext, 'GraphQL error occurred');
    }
    else {
        logger.warn(logContext, 'GraphQL validation error');
    }
    // Format error response
    const errorResponse = (0, errors_js_1.sanitizeError)(appError, isProduction);
    return {
        message: errorResponse.error.message,
        locations: error.locations,
        path: error.path,
        extensions: {
            code: appError.code,
            traceId: appError.traceId,
            timestamp: appError.timestamp.toISOString(),
            httpStatus: appError.httpStatus,
            ...(appError.details && !isProduction && { details: appError.details }),
        },
    };
}
/**
 * Create GraphQL error formatter function
 */
function createGraphQLErrorFormatter(isProduction) {
    const isProd = isProduction ?? process.env.NODE_ENV === 'production';
    return (error) => formatGraphQLError(error, isProd);
}
/**
 * Not found middleware for Express
 * Should be added before error handler
 */
function notFoundHandler(req, res, next) {
    const appError = (0, errors_js_1.toAppError)(new Error(`Route ${req.method} ${req.path} not found`));
    res.status(404).json({
        error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `Route not found: ${req.method} ${req.path}`,
            traceId: appError.traceId,
            timestamp: appError.timestamp.toISOString(),
            path: req.path,
        },
    });
}
/**
 * Request correlation ID middleware
 * Adds correlation ID to requests for tracing
 */
function correlationIdMiddleware(req, res, next) {
    const correlationId = req.headers['x-correlation-id'] ||
        req.headers['x-request-id'] ||
        randomUUID();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
}
function randomUUID() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
/**
 * Error recovery middleware
 * Attempts to recover from certain error types
 */
function errorRecoveryMiddleware(err, req, res, next) {
    const appError = (0, errors_js_1.toAppError)(err);
    // For retryable errors, suggest retry with backoff
    if (appError.retryable) {
        const retryAfter = calculateRetryAfter(appError);
        res.setHeader('Retry-After', retryAfter.toString());
    }
    // Pass to error handler
    next(err);
}
/**
 * Calculate retry-after value based on error type
 */
function calculateRetryAfter(error) {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
        return error.details?.retryAfter || 60;
    }
    if (error.code === 'CIRCUIT_BREAKER_OPEN') {
        return error.details?.retryAfter || 30;
    }
    if (error.retryable) {
        return 5;
    }
    return 0;
}
