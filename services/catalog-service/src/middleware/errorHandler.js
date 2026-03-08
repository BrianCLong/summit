"use strict";
/**
 * Error Handler Middleware
 * Handles errors and sends appropriate responses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode).json({
        error: {
            message: err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
}
