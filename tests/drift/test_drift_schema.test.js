"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const bellingcat_osint_toolkit_drift_1 = require("../../scripts/monitoring/bellingcat-osint-toolkit-drift");
(0, vitest_1.describe)('bellingcat drift schema', () => {
    (0, vitest_1.test)('produces summary shape with expected counters and results', () => {
        const report = (0, bellingcat_osint_toolkit_drift_1.buildDriftReport)('artifacts/toolkit/bellingcat.json');
        (0, vitest_1.expect)(report.source).toBe('bellingcat');
        (0, vitest_1.expect)(typeof report.checked_tools).toBe('number');
        (0, vitest_1.expect)(report.ok + report.warn + report.fail).toBe(report.checked_tools);
        (0, vitest_1.expect)(Array.isArray(report.results)).toBe(true);
        (0, vitest_1.expect)(report.results[0]).toHaveProperty('tool_id');
        (0, vitest_1.expect)(report.results[0]).toHaveProperty('status');
        (0, vitest_1.expect)(report.results[0]).toHaveProperty('http');
    });
});
