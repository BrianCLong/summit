"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// =============================================
// File: apps/web/tests/maestroApi.spec.ts
// =============================================
const vitest_1 = require("vitest");
const maestroApi_1 = require("../lib/maestroApi");
(0, vitest_1.describe)('MaestroApi (mock)', () => {
    const api = new maestroApi_1.MaestroApi({ mock: true });
    (0, vitest_1.it)('routePreview returns candidates', async () => {
        const res = await api.routePreview('test');
        (0, vitest_1.expect)(res.candidates.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('orchestrateWeb returns synthesized text', async () => {
        const res = await api.orchestrateWeb('task', ['web-serp']);
        (0, vitest_1.expect)(res.synthesized.text).toContain('task');
    });
});
