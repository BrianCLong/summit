"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const DataProfiler_js_1 = require("../profiler/DataProfiler.js");
(0, vitest_1.describe)('DataProfiler', () => {
    let profiler;
    let mockSource;
    (0, vitest_1.beforeEach)(() => {
        profiler = new DataProfiler_js_1.DataProfiler({
            sampleSize: 1000,
            detectPii: true,
            inferRelationships: true,
        });
        mockSource = {
            id: 'test-source-id',
            name: 'test-source',
            type: 'database',
            connectionUri: 'postgresql://localhost/test',
            status: 'discovered',
            discoveredAt: new Date(),
            confidenceScore: 0.9,
            tags: [],
            autoIngestEnabled: false,
        };
    });
    (0, vitest_1.describe)('profile', () => {
        (0, vitest_1.it)('should profile data and return quality scores', async () => {
            const data = [
                ['name', 'email', 'age'],
                ['John Doe', 'john@example.com', 30],
                ['Jane Smith', 'jane@example.com', 25],
                ['Bob Wilson', 'bob@example.com', 35],
            ];
            const profile = await profiler.profile(mockSource, data);
            (0, vitest_1.expect)(profile.sourceId).toBe(mockSource.id);
            (0, vitest_1.expect)(profile.rowCount).toBe(3);
            (0, vitest_1.expect)(profile.columnCount).toBe(3);
            (0, vitest_1.expect)(profile.columns).toHaveLength(3);
            (0, vitest_1.expect)(profile.overallQuality).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should detect semantic types', async () => {
            const data = [
                ['email', 'phone'],
                ['john@example.com', '555-123-4567'],
                ['jane@example.com', '555-987-6543'],
            ];
            const profile = await profiler.profile(mockSource, data);
            const emailCol = profile.columns.find(c => c.name === 'email');
            (0, vitest_1.expect)(emailCol?.semanticType).toBe('email');
        });
        (0, vitest_1.it)('should detect PII fields', async () => {
            const data = [
                ['ssn', 'name'],
                ['123-45-6789', 'John Doe'],
                ['987-65-4321', 'Jane Smith'],
            ];
            const profile = await profiler.profile(mockSource, data);
            const ssnCol = profile.columns.find(c => c.name === 'ssn');
            (0, vitest_1.expect)(ssnCol?.piiDetected).toBe(true);
        });
        (0, vitest_1.it)('should calculate column quality metrics', async () => {
            const data = [
                ['name', 'age'],
                ['John', 30],
                ['Jane', null],
                ['Bob', 35],
            ];
            const profile = await profiler.profile(mockSource, data);
            const ageCol = profile.columns.find(c => c.name === 'age');
            (0, vitest_1.expect)(ageCol?.qualityScores.completeness).toBeLessThan(1);
            (0, vitest_1.expect)(ageCol?.nullCount).toBe(1);
        });
    });
    (0, vitest_1.describe)('generateReport', () => {
        (0, vitest_1.it)('should generate markdown report', async () => {
            const data = [
                ['name', 'email'],
                ['John', 'john@example.com'],
            ];
            const profile = await profiler.profile(mockSource, data);
            const report = profiler.generateReport(profile);
            (0, vitest_1.expect)(report).toContain('# Data Profile Report');
            (0, vitest_1.expect)(report).toContain('name');
            (0, vitest_1.expect)(report).toContain('email');
        });
    });
});
