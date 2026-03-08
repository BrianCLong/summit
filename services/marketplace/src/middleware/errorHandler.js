"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const logger_js_1 = require("../utils/logger.js");
function errorHandler(err, _req, res, _next) {
    logger_js_1.logger.error('Request error', { error: err.message, stack: err.stack });
    // Zod validation errors
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: 'Validation error',
            details: err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }
    // Known business errors
    if (err.message.includes('not found')) {
        res.status(404).json({ error: err.message });
        return;
    }
    if (err.message.includes('not available') || err.message.includes('invalid')) {
        res.status(400).json({ error: err.message });
        return;
    }
    // Default server error
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
    });
}
