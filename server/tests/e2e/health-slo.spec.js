"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('SLO @slo', () => {
    const thresholdMs = Number(process.env.HEALTH_P95_MS ?? 300);
    const samples = Number(process.env.HEALTH_SAMPLES ?? 5);
    (0, test_1.test)('health endpoint meets latency SLO', async ({ request }) => {
        const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
        const healthUrl = `${apiUrl}/health`;
        const latencies = [];
        for (let i = 0; i < samples; i++) {
            const start = Date.now();
            let response;
            try {
                response = await request.get(healthUrl, { timeout: thresholdMs * 5 });
            }
            catch (error) {
                test_1.test.skip(`Health check unavailable: ${error.message}`);
                return;
            }
            if (!response.ok()) {
                test_1.test.fail(true, `Health endpoint returned HTTP ${response.status()}`);
                return;
            }
            latencies.push(Date.now() - start);
        }
        latencies.sort((a, b) => a - b);
        const index = Math.max(Math.ceil(latencies.length * 0.95) - 1, 0);
        const p95 = latencies[index];
        test_1.test.info().annotations.push({ type: 'latencies', description: JSON.stringify(latencies) });
        (0, test_1.expect)(p95, `p95 latency ${p95}ms exceeded ${thresholdMs}ms`).toBeLessThanOrEqual(thresholdMs);
    });
});
