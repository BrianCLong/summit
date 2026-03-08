"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityIncidentLogger = securityIncidentLogger;
const logger_js_1 = require("../config/logger.js");
const comprehensive_telemetry_js_1 = require("../lib/telemetry/comprehensive-telemetry.js");
const SECURITY_RELEVANT_CODES = new Set([401, 403, 429, 499, 500, 503]);
function securityIncidentLogger(req, res, next) {
    const startedAt = Date.now();
    res.on('finish', () => {
        const status = res.statusCode;
        const flagged = SECURITY_RELEVANT_CODES.has(status) || res.getHeader('x-security-incident');
        if (!flagged)
            return;
        const durationMs = Date.now() - startedAt;
        const authReq = req;
        const incident = {
            path: req.originalUrl,
            method: req.method,
            status,
            ip: req.ip,
            user: authReq.user?.sub || authReq.user?.id,
            sessionId: authReq.sessionId,
            durationMs,
        };
        logger_js_1.logger.warn({ incident }, 'Security incident detected');
        comprehensive_telemetry_js_1.telemetry.subsystems?.security?.incidents?.add?.(1);
        comprehensive_telemetry_js_1.telemetry.subsystems?.security?.lastIncidentMs?.record?.(durationMs);
    });
    next();
}
