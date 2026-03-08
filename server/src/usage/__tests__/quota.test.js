"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const quota_js_1 = require("../quota.js");
(0, globals_1.describe)('PostgresQuotaService', () => {
    const tenantId = 'tenant-123';
    const buildService = (quota, usage) => {
        const dataSource = new quota_js_1.InMemoryQuotaDataSource({ [tenantId]: quota }, { [tenantId]: usage });
        return new quota_js_1.PostgresQuotaService(dataSource);
    };
    const check = (service, dimension, quantity) => service.check({ tenantId, dimension, quantity });
    (0, globals_1.it)('allows usage when within limits', async () => {
        const service = buildService({ 'api.requests': { limit: 100, hardLimit: true } }, { 'api.requests': 25 });
        const decision = await check(service, 'api.requests', 10);
        (0, globals_1.expect)(decision.allowed).toBe(true);
        (0, globals_1.expect)(decision.remaining).toBe(65);
        (0, globals_1.expect)(decision.limit).toBe(100);
        (0, globals_1.expect)(decision.reason).toBeUndefined();
        (0, globals_1.expect)(decision.hardLimit).toBe(true);
    });
    (0, globals_1.it)('denies when exceeding a soft limit and annotates the reason', async () => {
        const service = buildService({ 'llm.tokens': { limit: 5_000, hardLimit: false } }, { 'llm.tokens': 4_800 });
        const quotaCheck = { tenantId, dimension: 'llm.tokens', quantity: 500 };
        const decision = await service.check(quotaCheck);
        (0, globals_1.expect)(decision.allowed).toBe(false);
        (0, globals_1.expect)(decision.hardLimit).toBe(false);
        (0, globals_1.expect)(decision.remaining).toBe(0);
        (0, globals_1.expect)(decision.reason).toContain('Soft quota exceeded');
        await (0, globals_1.expect)(service.assert(quotaCheck)).rejects.toThrow('SOFT_QUOTA_EXCEEDED');
    });
    (0, globals_1.it)('denies when exceeding a hard limit and throws a detailed error', async () => {
        const service = buildService({ 'maestro.runs': { limit: 3, hardLimit: true } }, { 'maestro.runs': 3 });
        const quotaCheck = { tenantId, dimension: 'maestro.runs', quantity: 1 };
        const decision = await service.check(quotaCheck);
        (0, globals_1.expect)(decision.allowed).toBe(false);
        (0, globals_1.expect)(decision.hardLimit).toBe(true);
        (0, globals_1.expect)(decision.reason).toContain('Hard quota exceeded');
        await (0, globals_1.expect)(service.assert(quotaCheck)).rejects.toThrow('HARD_QUOTA_EXCEEDED');
    });
    (0, globals_1.it)('allows usage when no limit is configured for dimension', async () => {
        const service = buildService({}, {});
        const decision = await check(service, 'graph.queries', 100);
        (0, globals_1.expect)(decision.allowed).toBe(true);
        (0, globals_1.expect)(decision.limit).toBeUndefined();
        (0, globals_1.expect)(decision.remaining).toBeUndefined();
    });
    (0, globals_1.it)('rejects negative quantity', async () => {
        const service = buildService({ 'api.requests': { limit: 100, hardLimit: true } }, {});
        await (0, globals_1.expect)(check(service, 'api.requests', -5)).rejects.toThrow('Quantity must be non-negative');
    });
});
