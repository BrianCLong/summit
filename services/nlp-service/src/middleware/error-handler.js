"use strict";
/**
 * Error handling middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(error, req, res, next) {
    console.error('Error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
}
