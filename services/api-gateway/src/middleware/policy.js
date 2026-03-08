"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyGuard = policyGuard;
const logger_js_1 = require("../utils/logger.js");
/**
 * Enforces warrant/authority binding and reason-for-access.
 * In dry-run mode, annotates response warnings instead of blocking.
 */
function policyGuard({ dryRun = false } = {}) {
    return (req, res, next) => {
        const auth = req.headers['x-authority-id'];
        const reason = req.headers['x-reason-for-access'];
        if (!auth || !reason) {
            const denial = {
                error: 'Policy denial',
                reason: 'Missing authority binding or reason-for-access headers',
                appealPath: '/ombudsman/appeals',
            };
            logger_js_1.logger.warn('Policy violation', {
                path: req.path,
                method: req.method,
                missingAuth: !auth,
                missingReason: !reason,
                userAgent: req.headers['user-agent'],
                ip: req.ip,
            });
            if (dryRun) {
                // Annotate request with policy warnings
                req.__policyWarnings = [
                    req.__policyWarnings || [],
                    denial,
                ].flat();
                logger_js_1.logger.warn('Policy dry-run: would have blocked request', denial);
                return next();
            }
            return res.status(403).json(denial);
        }
        // Store policy context
        req.authorityId = auth;
        req.reasonForAccess = reason;
        logger_js_1.logger.info('Policy check passed', {
            authorityId: auth,
            reasonForAccess: reason,
            path: req.path,
        });
        next();
    };
}
