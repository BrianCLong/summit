"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkQuotaMiddleware = exports.requestMeteringMiddleware = void 0;
const quotas_js_1 = require("./quotas.js");
const emitter_js_1 = require("./emitter.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// Feature flag for hard enforcement. Default OFF (warn-only).
const ENFORCE_QUOTAS = process.env.ENFORCE_QUOTAS === 'true';
const requestMeteringMiddleware = (req, res, next) => {
    const start = Date.now();
    // Hook into response finish to capture accurate status and duration
    res.on('finish', () => {
        const tenantId = req.user?.tenantId;
        if (tenantId) {
            emitter_js_1.meteringEmitter.emitApiRequest({
                tenantId,
                source: 'api-middleware',
                method: req.method,
                endpoint: req.path,
                statusCode: res.statusCode,
                metadata: {
                    durationMs: Date.now() - start
                }
            }).catch(err => {
                logger_js_1.default.warn({ error: err }, 'Failed to emit api request meter event');
            });
        }
    });
    next();
};
exports.requestMeteringMiddleware = requestMeteringMiddleware;
const checkQuotaMiddleware = (metric, cost = 1) => {
    return async (req, res, next) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                // If no tenant context, we can't enforce quota. Skip.
                next();
                return;
            }
            const result = await quotas_js_1.quotaManager.checkQuota(tenantId, metric, cost);
            if (result.softExceeded) {
                logger_js_1.default.warn({ tenantId, metric, message: result.message }, 'Quota soft limit exceeded');
                // Add header for client visibility
                res.setHeader('X-Quota-Warning', result.message || 'Quota exceeded');
            }
            if (!result.allowed) {
                if (ENFORCE_QUOTAS) {
                    logger_js_1.default.warn({ tenantId, metric }, 'Quota hard limit exceeded, blocking request');
                    res.status(429).json({ error: 'Quota exceeded', message: result.message });
                    return;
                }
                else {
                    logger_js_1.default.info({ tenantId, metric }, 'Quota hard limit exceeded but enforcement is OFF');
                }
            }
            next();
        }
        catch (error) {
            logger_js_1.default.error({ error }, 'Error in quota middleware');
            next(); // Fail open to avoid blocking due to system error
        }
    };
};
exports.checkQuotaMiddleware = checkQuotaMiddleware;
