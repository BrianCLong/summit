"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForbiddenError = exports.UnauthorizedError = exports.ConflictError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const logger_js_1 = require("../utils/logger.js");
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode = 500, code, details) {
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
        super(message, 400, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource, id) {
        super(id ? `${resource} with id '${id}' not found` : `${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
function errorHandler(err, _req, res, _next) {
    // Log the error
    logger_js_1.logger.error('Request error', {
        error: err.message,
        stack: err.stack,
        name: err.name,
    });
    // Handle Zod validation errors
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
                code: e.code,
            })),
        });
        return;
    }
    // Handle application errors
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
            details: err.details,
        });
        return;
    }
    // Handle database errors
    if (err.message.includes('duplicate key')) {
        res.status(409).json({
            error: 'Resource already exists',
            code: 'DUPLICATE',
        });
        return;
    }
    if (err.message.includes('violates foreign key')) {
        res.status(400).json({
            error: 'Referenced resource does not exist',
            code: 'FOREIGN_KEY_VIOLATION',
        });
        return;
    }
    // Default error response
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
        code: 'INTERNAL_ERROR',
    });
}
