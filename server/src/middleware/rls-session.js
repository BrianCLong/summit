"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rlsSessionMiddleware = void 0;
const node_perf_hooks_1 = require("node:perf_hooks");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const rlsContext_js_1 = require("../security/rlsContext.js");
const rlsLogger = logger_js_1.default.child({ name: 'rls-session' });
const DEFAULT_PREFIXES = ['/api/cases', '/api/case-tasks', '/api/case-workflow'];
const rlsSessionMiddleware = (options = {}) => (req, res, next) => {
    if (!(0, rlsContext_js_1.isRlsFeatureFlagEnabled)()) {
        return next();
    }
    if (options.stagingOnly !== false && process.env.NODE_ENV !== 'staging') {
        return next();
    }
    const prefixes = options.trackedPrefixes ?? DEFAULT_PREFIXES;
    const isTracked = prefixes.some((prefix) => req.path?.startsWith(prefix));
    if (!isTracked) {
        return next();
    }
    const tenantId = req.headers['x-tenant-id'] ||
        req.headers['x-tenant'] ||
        req.user?.tenant_id ||
        req.user?.tenantId;
    const caseId = req.params?.caseId ||
        req.params?.id ||
        req.headers['x-case-id'];
    const start = node_perf_hooks_1.performance.now();
    (0, rlsContext_js_1.runWithRlsContext)({
        tenantId: tenantId || undefined,
        caseId: caseId || undefined,
        enabled: true,
        path: req.path,
        method: req.method,
        overheadMs: 0,
    }, () => {
        res.once('finish', () => {
            const ctx = (0, rlsContext_js_1.getRlsContext)();
            if (!ctx?.enabled)
                return;
            const overheadMs = ctx.overheadMs ?? 0;
            const elapsedMs = node_perf_hooks_1.performance.now() - start;
            rlsLogger.debug({
                tenantId: ctx.tenantId,
                caseId: ctx.caseId,
                path: ctx.path,
                method: ctx.method,
                overheadMs,
                elapsedMs,
            }, 'RLS session applied for tracked route');
        });
        (0, rlsContext_js_1.updateCaseContext)(caseId || undefined);
        next();
    });
};
exports.rlsSessionMiddleware = rlsSessionMiddleware;
exports.default = exports.rlsSessionMiddleware;
