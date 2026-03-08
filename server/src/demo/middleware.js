"use strict";
/**
 * @file server/src/demo/middleware.ts
 * @description Express middleware to enforce Demo Mode hard gate.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoGate = demoGate;
const gate_js_1 = require("./gate.js");
const logger_js_1 = require("../config/logger.js");
/**
 * Middleware that blocks requests if DEMO_MODE is not enabled.
 * Returns 404 Not Found to hide demo endpoints from non-demo environments.
 */
function demoGate(req, res, next) {
    if (!(0, gate_js_1.isDemoEnabled)()) {
        // Log the blocked attempt at debug level
        logger_js_1.logger.debug({ path: req.path, ip: req.ip }, 'Blocked request to disabled demo endpoint');
        // Return 404 to pretend the endpoint doesn't exist (security by obscurity for this feature)
        res.status(404).json({ error: 'Not Found' });
        return;
    }
    next();
}
