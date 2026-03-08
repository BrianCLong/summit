"use strict";
/**
 * Request logging middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = logger;
function logger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    next();
}
