"use strict";
/**
 * Error Handler Middleware
 *
 * Normalizes errors into the platform-wide envelope
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationException = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const errors_1 = require("@intelgraph/errors");
function toSummitError(err, req) {
    if ((0, errors_1.isSummitError)(err)) {
        return err;
    }
    return errors_1.errorFactory.internal({
        errorCode: 'INTERNAL_UNHANDLED',
        humanMessage: 'An unexpected error occurred.',
        developerMessage: err.message,
        traceId: req.context?.traceId,
        context: {
            path: req.path,
            method: req.method,
        },
        cause: err,
    });
}
function buildMetadata(req) {
    return {
        timestamp: new Date().toISOString(),
        version: req.context?.apiVersion || '1.0',
        requestId: req.context?.requestId || 'unknown',
        traceId: req.context?.traceId,
    };
}
function errorHandler(options) {
    return (err, req, res, next) => {
        const summitError = toSummitError(err, req);
        if (options?.logger) {
            options.logger(err, req);
        }
        const payload = {
            success: false,
            error: summitError.envelope,
            metadata: {
                ...buildMetadata(req),
                duration: req.context ? Date.now() - req.context.startTime : undefined,
            },
        };
        if (options?.includeStack && process.env.NODE_ENV !== 'production') {
            payload.error = {
                ...payload.error,
                context: {
                    ...payload.error.context,
                    stack: err.stack,
                },
            };
        }
        res.status(summitError.statusCode).json(payload);
    };
}
function notFoundHandler(req, res) {
    const summitError = errors_1.errorFactory.validation({
        errorCode: 'ROUTE_NOT_FOUND',
        humanMessage: `Route ${req.method} ${req.path} not found`,
        developerMessage: 'Requested route is not registered in the router',
        traceId: req.context?.traceId,
        context: { path: req.path, method: req.method },
        statusCode: 404,
    });
    res.status(404).json({
        success: false,
        error: summitError.envelope,
        metadata: buildMetadata(req),
    });
}
/**
 * Validation error specifically for REST API
 */
class ValidationException extends errors_1.SummitError {
    constructor(message, context) {
        const error = errors_1.errorFactory.validation({
            errorCode: 'VALIDATION_ERROR',
            humanMessage: message,
            developerMessage: message,
            context,
        });
        super(error.envelope, error.statusCode, null);
        this.name = 'ValidationException';
    }
}
exports.ValidationException = ValidationException;
