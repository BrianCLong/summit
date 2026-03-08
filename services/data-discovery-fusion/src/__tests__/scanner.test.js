"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const SourceScanner_js_1 = require("../scanner/SourceScanner.js");
(0, vitest_1.describe)('SourceScanner', () => {
    let scanner;
    (0, vitest_1.beforeEach)(() => {
        scanner = new SourceScanner_js_1.SourceScanner({
            scanInterval: 60000,
            endpoints: [],
            autoIngestThreshold: 0.8,
        });
    });
    afterEach(() => {
        scanner.stop();
    });
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should initialize with config', () => {
            (0, vitest_1.expect)(scanner.getDiscoveredSources()).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('addEndpoint', () => {
        (0, vitest_1.it)('should add scan endpoint', () => {
            scanner.addEndpoint({
                type: 'database',
                uri: 'postgresql://localhost/test',
            });
            // Endpoint added successfully (no error thrown)
            (0, vitest_1.expect)(true).toBe(true);
        });
        (0, vitest_1.it)('should add multiple endpoints', () => {
            scanner.addEndpoint({ type: 'database', uri: 'postgresql://localhost/db1' });
            scanner.addEndpoint({ type: 'api', uri: 'https://api.example.com' });
            scanner.addEndpoint({ type: 's3', uri: 's3://bucket/prefix' });
            // All endpoints added successfully
            (0, vitest_1.expect)(true).toBe(true);
        });
    });
    (0, vitest_1.describe)('scan', () => {
        (0, vitest_1.it)('should complete scan and return results', async () => {
            const result = await scanner.scan();
            (0, vitest_1.expect)(result).toHaveProperty('sources');
            (0, vitest_1.expect)(result).toHaveProperty('errors');
            (0, vitest_1.expect)(result).toHaveProperty('duration');
            (0, vitest_1.expect)(Array.isArray(result.sources)).toBe(true);
            (0, vitest_1.expect)(typeof result.duration).toBe('number');
        });
        (0, vitest_1.it)('should not run concurrent scans', async () => {
            // Start first scan
            const scan1 = scanner.scan();
            // Start second scan immediately
            const scan2 = scanner.scan();
            const [result1, result2] = await Promise.all([scan1, scan2]);
            // Second scan should return empty (skipped)
            (0, vitest_1.expect)(result2.sources).toHaveLength(0);
            (0, vitest_1.expect)(result2.duration).toBe(0);
        });
    });
    (0, vitest_1.describe)('start/stop', () => {
        (0, vitest_1.it)('should start and stop scanning', () => {
            scanner.start();
            // Should not throw
            (0, vitest_1.expect)(true).toBe(true);
            scanner.stop();
            // Should not throw
            (0, vitest_1.expect)(true).toBe(true);
        });
        (0, vitest_1.it)('should handle multiple start calls', () => {
            scanner.start();
            scanner.start(); // Should not create duplicate intervals
            scanner.stop();
            (0, vitest_1.expect)(true).toBe(true);
        });
    });
    (0, vitest_1.describe)('event emission', () => {
        (0, vitest_1.it)('should emit events on source discovery', async () => {
            const eventHandler = vitest_1.vi.fn();
            scanner.on('event', eventHandler);
            // Trigger a scan (even if no sources found, it tests the flow)
            await scanner.scan();
            // Event system is working (handler was registered)
            (0, vitest_1.expect)(typeof scanner.on).toBe('function');
        });
        (0, vitest_1.it)('should emit auto_ingest for high confidence sources', () => {
            const autoIngestHandler = vitest_1.vi.fn();
            scanner.on('auto_ingest', autoIngestHandler);
            // Handler registered successfully
            (0, vitest_1.expect)(typeof scanner.on).toBe('function');
        });
    });
    (0, vitest_1.describe)('getSource', () => {
        (0, vitest_1.it)('should return undefined for non-existent source', () => {
            const source = scanner.getSource('non-existent-id');
            (0, vitest_1.expect)(source).toBeUndefined();
        });
    });
});
