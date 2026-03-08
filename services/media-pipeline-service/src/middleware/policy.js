"use strict";
/**
 * Policy Middleware
 *
 * Enforces authority binding and reason-for-access requirements.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyMiddleware = policyMiddleware;
const index_js_1 = __importDefault(require("../config/index.js"));
const logger_js_1 = require("../utils/logger.js");
async function policyMiddleware(request, reply) {
    const authorityId = request.headers['x-authority-id'];
    const reasonForAccess = request.headers['x-reason-for-access'];
    // Skip policy check for health endpoints
    if (request.url.startsWith('/health')) {
        return;
    }
    if (!authorityId || !reasonForAccess) {
        const isDryRun = index_js_1.default.policyDryRun;
        if (isDryRun) {
            request.policyWarnings = request.policyWarnings || [];
            request.policyWarnings.push({
                error: 'Policy denial',
                reason: 'Missing authority binding or reason-for-access',
                appealPath: '/ombudsman/appeals',
            });
            logger_js_1.logger.warn({
                url: request.url,
                method: request.method,
                correlationId: request.correlationId,
            }, 'Policy check failed (dry-run mode)');
            return;
        }
        logger_js_1.logger.warn({
            url: request.url,
            method: request.method,
            correlationId: request.correlationId,
        }, 'Policy check failed - access denied');
        return reply.status(403).send({
            error: 'Policy denial',
            reason: 'Missing authority binding or reason-for-access',
            appealPath: '/ombudsman/appeals',
        });
    }
    request.authorityId = authorityId;
    request.reasonForAccess = reasonForAccess;
}
