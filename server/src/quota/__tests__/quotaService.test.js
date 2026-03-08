"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const middleware_js_1 = require("../middleware.js");
const service_js_1 = require("../service.js");
const config_js_1 = require("../config.js");
const createMockReq = (init) => {
    return {
        headers: {},
        method: 'GET',
        url: '/api/test',
        ...init,
    };
};
const createMockRes = () => {
    const headers = {};
    let statusCode = 200;
    let body;
    return {
        status(code) {
            statusCode = code;
            return this;
        },
        json(payload) {
            body = payload;
            return this;
        },
        setHeader(key, value) {
            headers[key.toLowerCase()] = value;
        },
        getHeader(key) {
            return headers[key.toLowerCase()];
        },
        get statusCode() {
            return statusCode;
        },
        get body() {
            return body;
        },
    };
};
(0, globals_1.describe)('QuotaService integration', () => {
    const quotaJson = JSON.stringify({
        alpha: {
            storageBytes: 1024,
            evidenceCount: 1,
            exportCount: 1,
            jobConcurrency: 1,
            apiRatePerMinute: 2,
        },
    });
    let service;
    (0, globals_1.beforeEach)(() => {
        process.env.TENANT_QUOTAS = quotaJson;
        (0, config_js_1.resetTenantQuotaCache)();
        service_js_1.quotaService.reset();
        service = new service_js_1.QuotaService();
    });
    (0, globals_1.afterEach)(() => {
        service.reset();
        delete process.env.TENANT_QUOTAS;
    });
    test('enforces evidence finalization deterministically', () => {
        const first = service.checkEvidence('alpha', 'evidence-1', 512);
        const repeat = service.checkEvidence('alpha', 'evidence-1', 512);
        (0, globals_1.expect)(first.allowed).toBe(true);
        (0, globals_1.expect)(repeat.allowed).toBe(true);
        (0, globals_1.expect)(repeat.used).toBe(1);
        const second = service.checkEvidence('alpha', 'evidence-2', 256);
        (0, globals_1.expect)(second.allowed).toBe(false);
        (0, globals_1.expect)(second.reason).toBe('evidence_exceeded');
    });
    test('blocks export creation after limit reached', () => {
        const first = middleware_js_1.quotaGuards.checkExportCreation('alpha', 'export-1');
        const second = middleware_js_1.quotaGuards.checkExportCreation('alpha', 'export-2');
        (0, globals_1.expect)(first.allowed).toBe(true);
        (0, globals_1.expect)(second.allowed).toBe(false);
        (0, globals_1.expect)(second.reason).toBe('export_exceeded');
    });
    test('limits job concurrency and allows completion', () => {
        const first = service.checkJobEnqueue('alpha', 'job-1');
        const second = service.checkJobEnqueue('alpha', 'job-2');
        (0, globals_1.expect)(first.allowed).toBe(true);
        (0, globals_1.expect)(second.allowed).toBe(false);
        service.completeJob('alpha');
        const third = service.checkJobEnqueue('alpha', 'job-3');
        (0, globals_1.expect)(third.allowed).toBe(true);
    });
    test('enforces storage bytes and returns remaining budget', () => {
        const allowed = service.checkStorageBytes('alpha', 512, 'file-1');
        const denied = service.checkStorageBytes('alpha', 600, 'file-2');
        (0, globals_1.expect)(allowed.allowed).toBe(true);
        (0, globals_1.expect)(denied.allowed).toBe(false);
        (0, globals_1.expect)(denied.reason).toBe('storage_exceeded');
    });
    test('middleware blocks API rate and returns retry metadata', async () => {
        const request = createMockReq({ headers: { 'x-tenant-id': 'alpha' } });
        const response = createMockRes();
        const next = globals_1.jest.fn();
        const middleware = middleware_js_1.quotaMiddleware;
        await middleware(request, response, next);
        await middleware(request, response, next);
        await middleware(request, response, next);
        (0, globals_1.expect)(next).toHaveBeenCalledTimes(2);
        (0, globals_1.expect)(response.statusCode).toBe(429);
        const data = response.body;
        (0, globals_1.expect)(data.reason).toBe('api_rate_exceeded');
        (0, globals_1.expect)(data.limit).toBe(2);
        (0, globals_1.expect)(data.used).toBe(3);
        (0, globals_1.expect)(data.remaining).toBe(0);
        (0, globals_1.expect)(data.retryAfterMs).toBeGreaterThan(0);
    });
    test('middleware no-ops when TENANT_QUOTAS is empty', async () => {
        delete process.env.TENANT_QUOTAS;
        (0, config_js_1.resetTenantQuotaCache)();
        const request = createMockReq();
        const response = createMockRes();
        const next = globals_1.jest.fn();
        const middleware = middleware_js_1.quotaMiddleware;
        await middleware(request, response, next);
        (0, globals_1.expect)(next).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(response.statusCode).toBe(200);
        (0, globals_1.expect)(response.getHeader('X-Ratelimit-Limit')).toBeUndefined();
    });
    test('deterministic counters do not double count repeated evidence', () => {
        const first = service.checkEvidence('alpha', 'evidence-dup', 100);
        const second = service.checkEvidence('alpha', 'evidence-dup', 200);
        (0, globals_1.expect)(first.allowed).toBe(true);
        (0, globals_1.expect)(second.allowed).toBe(true);
        (0, globals_1.expect)(second.used).toBe(1);
        const third = service.checkEvidence('alpha', 'evidence-new', 900);
        (0, globals_1.expect)(third.allowed).toBe(false);
        (0, globals_1.expect)(third.reason).toBe('evidence_exceeded');
    });
});
