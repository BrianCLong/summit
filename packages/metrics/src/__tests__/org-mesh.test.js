"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const org_mesh_1 = require("../org-mesh");
(0, vitest_1.describe)('OrgMeshMetrics', () => {
    (0, vitest_1.it)('should be a singleton', () => {
        const instance1 = org_mesh_1.metrics;
        // @ts-ignore
        const instance2 = org_mesh_1.metrics.constructor.getInstance();
        (0, vitest_1.expect)(instance1).toBe(instance2);
    });
    (0, vitest_1.it)('should record ingest duration', () => {
        const observeSpy = vitest_1.vi.spyOn(org_mesh_1.metrics.ingestDuration, 'observe');
        org_mesh_1.metrics.ingestDuration.observe({ source: 'mock', status: 'success' }, 1.5);
        (0, vitest_1.expect)(observeSpy).toHaveBeenCalledWith({ source: 'mock', status: 'success' }, 1.5);
    });
    (0, vitest_1.it)('should trace operations', async () => {
        const result = await org_mesh_1.metrics.traceOperation('test-op', async () => {
            return 'success';
        });
        (0, vitest_1.expect)(result).toBe('success');
    });
});
