"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotaGuards = exports.quotaMiddleware = void 0;
const service_js_1 = require("./service.js");
const getTenantId = (req) => {
    return (req.headers['x-tenant-id'] ||
        req.tenantId ||
        req.user?.tenantId ||
        'default');
};
const quotaReject = (res, status, result) => {
    const payload = {
        error: 'QUOTA_EXCEEDED',
        reason: result.reason,
        limit: result.limit,
        used: result.used,
        remaining: result.remaining,
    };
    if (result.retryAfterMs !== undefined) {
        payload.retryAfterMs = result.retryAfterMs;
        const retrySeconds = Math.max(0, Math.ceil(result.retryAfterMs / 1000));
        res.setHeader('Retry-After', retrySeconds);
    }
    return res.status(status).json(payload);
};
const quotaMiddleware = (req, res, next) => {
    if (!service_js_1.quotaService.isEnabled()) {
        return next();
    }
    const tenantId = getTenantId(req);
    const result = service_js_1.quotaService.checkApiRequest(tenantId);
    if (!result.allowed) {
        return quotaReject(res, 429, result);
    }
    if (Number.isFinite(result.limit)) {
        res.setHeader('X-RateLimit-Limit', result.limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
    }
    return next();
};
exports.quotaMiddleware = quotaMiddleware;
exports.quotaGuards = {
    checkEvidenceFinalize: (tenantId, evidenceId, sizeBytes) => service_js_1.quotaService.checkEvidence(tenantId, evidenceId, sizeBytes),
    checkExportCreation: (tenantId, exportId) => service_js_1.quotaService.checkExport(tenantId, exportId),
    checkJobEnqueue: (tenantId, jobKey) => service_js_1.quotaService.checkJobEnqueue(tenantId, jobKey),
    completeJob: (tenantId, delta) => service_js_1.quotaService.completeJob(tenantId, delta ?? 1),
    checkStorageBytes: (tenantId, bytes, fingerprint) => service_js_1.quotaService.checkStorageBytes(tenantId, bytes, fingerprint),
};
