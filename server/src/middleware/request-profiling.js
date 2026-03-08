"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestProfilingMiddleware = requestProfilingMiddleware;
const perf_hooks_1 = require("perf_hooks");
const logger_js_1 = require("../config/logger.js");
function resolveRouteName(req) {
    const routePath = req.route?.path;
    if (routePath) {
        return `${req.baseUrl || ''}${routePath}`;
    }
    return req.path || req.originalUrl || 'unknown';
}
function requestProfilingMiddleware(req, res, next) {
    const start = perf_hooks_1.performance.now();
    res.on('finish', () => {
        const durationMs = perf_hooks_1.performance.now() - start;
        logger_js_1.logger.info({
            method: req.method,
            route: resolveRouteName(req),
            status: res.statusCode,
            durationMs,
        }, 'request completed');
    });
    next();
}
