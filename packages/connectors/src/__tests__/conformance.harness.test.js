"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const conformance_1 = require("../conformance");
(0, vitest_1.describe)('ConnectorConformanceHarness', () => {
    (0, vitest_1.it)('produces a clear pass/fail report for a compliant connector', async () => {
        const connector = new conformance_1.FakeConnector();
        const harness = new conformance_1.ConnectorConformanceHarness(connector, {
            pageSize: 2,
            maxRetries: 3,
            rateLimitChecks: 4,
        });
        const report = await harness.run();
        (0, vitest_1.expect)(report.connectorName).toBe('fake-connector');
        (0, vitest_1.expect)(report.passed).toBe(true);
        (0, vitest_1.expect)(report.failures).toHaveLength(0);
        (0, vitest_1.expect)(report.results.map((result) => result.name)).toEqual([
            'idempotency',
            'retries',
            'pagination',
            'rate limits',
            'error mapping',
            'evidence completeness',
            'redaction',
        ]);
    });
    (0, vitest_1.it)('is easy to extend with custom options', async () => {
        const connector = new conformance_1.FakeConnector();
        const harness = new conformance_1.ConnectorConformanceHarness(connector, { pageSize: 1, rateLimitChecks: 2 });
        const report = await harness.run();
        (0, vitest_1.expect)(report.passed).toBe(true);
        (0, vitest_1.expect)(report.results.some((result) => result.name === 'pagination')).toBe(true);
    });
});
