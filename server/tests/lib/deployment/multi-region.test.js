"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const multi_region_prober_js_1 = require("../../../src/lib/deployment/multi-region-prober.js");
const region_skew_detector_js_1 = require("../../../src/lib/deployment/region-skew-detector.js");
// Mock the metrics module to avoid actual Prometheus calls
globals_1.jest.mock('../../../src/monitoring/metrics.js', () => ({
    regionProbeLatencyMs: { set: globals_1.jest.fn() },
    regionHealthStatus: { set: globals_1.jest.fn() },
    rollbackEventsTotal: { inc: globals_1.jest.fn() }
}));
(0, globals_1.describe)('MultiRegionProber', () => {
    let regions;
    (0, globals_1.beforeEach)(() => {
        regions = [
            { id: 'r1', name: 'Region 1', endpoint: 'http://test1' },
            { id: 'r2', name: 'Region 2', endpoint: 'http://test2' }
        ];
    });
    (0, globals_1.test)('probes all regions', async () => {
        // Cast to any to bypass strict type checking for mock implementation
        const mockClient = {
            get: globals_1.jest.fn()
        };
        mockClient.get.mockResolvedValue({ status: 200 });
        const prober = new multi_region_prober_js_1.MultiRegionProber(regions, mockClient);
        const results = await prober.probeAll();
        (0, globals_1.expect)(results).toHaveLength(2);
        (0, globals_1.expect)(results[0].regionId).toBe('r1');
        (0, globals_1.expect)(results[0].isHealthy).toBe(true);
        (0, globals_1.expect)(mockClient.get).toHaveBeenCalledTimes(2);
    });
    (0, globals_1.test)('handles probe failures', async () => {
        const mockClient = {
            get: globals_1.jest.fn()
        };
        mockClient.get.mockImplementation(((url) => {
            if (url === 'http://test2')
                return Promise.reject(new Error('Failed'));
            return Promise.resolve({ status: 200 });
        }));
        const prober = new multi_region_prober_js_1.MultiRegionProber(regions, mockClient);
        const results = await prober.probeAll();
        (0, globals_1.expect)(results[0].isHealthy).toBe(true);
        (0, globals_1.expect)(results[1].isHealthy).toBe(false);
        (0, globals_1.expect)(results[1].error).toBe('Failed');
    });
});
(0, globals_1.describe)('RegionSkewDetector', () => {
    (0, globals_1.test)('detects skew above threshold', () => {
        const detector = new region_skew_detector_js_1.RegionSkewDetector(100);
        const statuses = [
            { regionId: 'r1', regionName: 'R1', isHealthy: true, latencyMs: 50, lastChecked: new Date() },
            { regionId: 'r2', regionName: 'R2', isHealthy: true, latencyMs: 200, lastChecked: new Date() }
        ];
        const result = detector.detectLatencySkew(statuses);
        (0, globals_1.expect)(result.detected).toBe(true);
        (0, globals_1.expect)(result.maxSkewMs).toBe(150);
    });
    (0, globals_1.test)('ignores skew below threshold', () => {
        const detector = new region_skew_detector_js_1.RegionSkewDetector(200);
        const statuses = [
            { regionId: 'r1', regionName: 'R1', isHealthy: true, latencyMs: 50, lastChecked: new Date() },
            { regionId: 'r2', regionName: 'R2', isHealthy: true, latencyMs: 100, lastChecked: new Date() }
        ];
        const result = detector.detectLatencySkew(statuses);
        (0, globals_1.expect)(result.detected).toBe(false);
    });
});
