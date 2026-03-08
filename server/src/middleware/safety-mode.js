"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safetyModeMiddleware = safetyModeMiddleware;
exports.resolveSafetyState = resolveSafetyState;
const safety_js_1 = require("../config/safety.js");
const logger_js_1 = require("../config/logger.js");
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SAFE_MODE_BLOCKED_PREFIXES = [
    '/api/webhooks',
    '/api/stream',
    '/api/ai',
    '/api/aurora',
    '/api/oracle',
    '/api/phantom-limb',
    '/api/echelon2',
    '/api/zero-day',
    '/api/abyss',
    '/api/scenarios',
];
function isHighRiskPath(path) {
    return SAFE_MODE_BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix));
}
function isMutatingRequest(req) {
    const method = req.method.toUpperCase();
    if (!MUTATING_METHODS.has(method)) {
        return false;
    }
    if (req.path === '/graphql') {
        const query = typeof req.body?.query === 'string' ? req.body.query.toLowerCase() : '';
        return query.includes('mutation') || query.includes('subscription');
    }
    return true;
}
async function safetyModeMiddleware(req, res, next) {
    try {
        const flagService = await (0, safety_js_1.getCachedFeatureFlagService)();
        if (await (0, safety_js_1.isGlobalKillSwitchEnabled)(flagService)) {
            if (isMutatingRequest(req)) {
                logger_js_1.logger.warn({ path: req.path, method: req.method }, 'Request blocked by global kill switch');
                res.status(503).json({
                    error: 'Global kill switch active: write operations are temporarily disabled',
                    code: 'GLOBAL_KILL_SWITCH_ACTIVE',
                });
                return;
            }
        }
        if (await (0, safety_js_1.isSafeModeEnabled)(flagService)) {
            if (isHighRiskPath(req.path)) {
                logger_js_1.logger.warn({ path: req.path, method: req.method }, 'Request blocked by safe mode');
                res.status(503).json({
                    error: 'Safe mode active: high-risk endpoint is temporarily unavailable',
                    code: 'SAFE_MODE_ACTIVE',
                });
                return;
            }
        }
        next();
    }
    catch (error) {
        logger_js_1.logger.error({ err: error, path: req.path }, 'Safety middleware error');
        next(error);
    }
}
async function resolveSafetyState() {
    const service = await (0, safety_js_1.getCachedFeatureFlagService)();
    return (0, safety_js_1.getSafetyState)(service);
}
