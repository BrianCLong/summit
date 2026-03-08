"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const QuotaService_js_1 = require("../QuotaService.js");
(0, globals_1.describe)('QuotaService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new QuotaService_js_1.QuotaService();
    });
    (0, globals_1.it)('allows usage when within quota', async () => {
        await service.assert({
            tenantId: 't1',
            dimension: 'custom.dimension',
            quantity: 1,
        });
        const quota = await service.getQuota('t1', 'custom.dimension');
        (0, globals_1.expect)(quota).not.toBeNull();
        (0, globals_1.expect)(quota?.used).toBe(1);
        (0, globals_1.expect)(quota?.limit).toBe(1000);
    });
    (0, globals_1.it)('throws QuotaExceededException when hard cap is exceeded', async () => {
        await service.setQuota('t1', 'api.calls', 5, 'daily');
        await service.assert({ tenantId: 't1', dimension: 'api.calls', quantity: 5 });
        await (0, globals_1.expect)(service.assert({ tenantId: 't1', dimension: 'api.calls', quantity: 1 })).rejects.toBeInstanceOf(QuotaService_js_1.QuotaExceededException);
    });
    (0, globals_1.it)('resets used quota via resetQuota', async () => {
        await service.setQuota('t1', 'graph.writes', 10, 'daily');
        await service.assert({ tenantId: 't1', dimension: 'graph.writes', quantity: 7 });
        let quota = await service.getQuota('t1', 'graph.writes');
        (0, globals_1.expect)(quota?.used).toBe(7);
        await service.resetQuota('t1', 'graph.writes');
        quota = await service.getQuota('t1', 'graph.writes');
        (0, globals_1.expect)(quota?.used).toBe(0);
    });
});
