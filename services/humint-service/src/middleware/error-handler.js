"use strict";
/**
 * Error Handler Middleware
 *
 * Centralized error handling with proper logging and response formatting.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, message, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(400, message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource, id) {
        super(404, id ? `${resource} with id ${id} not found` : `${resource} not found`, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(401, message, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Access denied') {
        super(403, message, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(message) {
        super(409, message, 'CONFLICT');
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
function errorHandler(logger) {
    return (err, req, res, _next) => {
        // Handle Zod validation errors
        if (err instanceof zod_1.ZodError) {
            const formattedErrors = err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
            }));
            logger.warn({ errors: formattedErrors, path: req.path }, 'Validation error');
            res.status(400).json({
                error: 'Validation Error',
                code: 'VALIDATION_ERROR',
                details: formattedErrors,
            });
            return;
        }
        // Handle known application errors
        if (err instanceof AppError) {
            if (err.statusCode >= 500) {
                logger.error({ err, path: req.path }, err.message);
            }
            else {
                logger.warn({ err, path: req.path }, err.message);
            }
            res.status(err.statusCode).json({
                error: err.message,
                code: err.code,
                ...(err.details && { details: err.details }),
            });
            return;
        }
        // Handle unknown errors
        logger.error({ err, path: req.path, stack: err.stack }, 'Unhandled error');
        res.status(500).json({
            error: 'Internal Server Error',
            code: 'INTERNAL_ERROR',
            ...(process.env.NODE_ENV !== 'production' && { message: err.message }),
        });
    };
}
