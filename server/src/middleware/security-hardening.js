"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityHardening = securityHardening;
const index_js_1 = require("../validation/index.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
/**
 * Security Hardening Middleware
 *
 * Validates all incoming requests (body, query, params) against known injection patterns.
 * Acts as an application-level Web Application Firewall (WAF).
 */
function securityHardening(req, res, next) {
    try {
        const inputs = [req.body, req.query, req.params];
        const errors = [];
        for (const input of inputs) {
            if (input) {
                // Deep traverse input to check strings
                // SecurityValidator.validateInput handles objects recursively?
                // No, looking at SecurityValidator in MutationValidators.ts, it converts input to string via JSON.stringify
                // and checks patterns. This is efficient for a global check.
                const validation = index_js_1.SecurityValidator.validateInput(input);
                if (!validation.valid) {
                    errors.push(...validation.errors);
                }
            }
        }
        if (errors.length > 0) {
            logger.warn({
                msg: 'Security violation detected',
                path: req.path,
                ip: req.ip,
                errors,
                // Don't log full body to avoid PII leak in logs, but maybe log a sample or hash?
                // For now, just log the errors.
            });
            return res.status(400).json({
                error: 'Security violation: Potential malicious input detected',
                code: 'SECURITY_VIOLATION'
            });
        }
        next();
    }
    catch (error) {
        logger.error({ error, path: req.path }, 'Error in security hardening middleware');
        // Fail closed
        res.status(500).json({ error: 'Internal security check failed' });
    }
}
