"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
const logger_js_1 = require("../utils/logger.js");
function requestLogger(req, res, next) {
    const start = Date.now();
    const { method, url, ip } = req;
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        const logData = {
            method,
            url,
            statusCode,
            duration,
            ip,
            userAgent: req.get('user-agent'),
            tenantId: req.tenantId,
        };
        if (statusCode >= 500) {
            logger_js_1.logger.error('Request completed with server error', logData);
        }
        else if (statusCode >= 400) {
            logger_js_1.logger.warn('Request completed with client error', logData);
        }
        else if (duration > 1000) {
            logger_js_1.logger.warn('Slow request', logData);
        }
        else {
            logger_js_1.logger.debug('Request completed', logData);
        }
    });
    next();
}
