"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const autoscaling_js_1 = require("../autoscaling.js");
(0, globals_1.describe)('AutoScalingPolicyGenerator', () => {
    let generator;
    const mockDate = new Date('2023-01-01T00:00:00Z');
    (0, globals_1.beforeEach)(() => {
        generator = new autoscaling_js_1.AutoScalingPolicyGenerator();
    });
    (0, globals_1.it)('should generate default policies for low traffic', () => {
        const metrics = {
            cpuUsagePercent: 20,
            memoryUsageBytes: 1024 * 1024 * 50, // 50MB
            requestRateRPS: 10,
            p95LatencyMs: 50,
            errorRatePercent: 0,
            timestamp: mockDate,
        };
        const policies = generator.generatePolicies('test-service', metrics);
        (0, globals_1.expect)(policies.hpa.spec.maxReplicas).toBe(10); // Default max
        (0, globals_1.expect)(policies.hpa.spec.minReplicas).toBe(2);
        (0, globals_1.expect)(policies.vpa.spec.updatePolicy.updateMode).toBe('Auto');
        (0, globals_1.expect)(policies.recommendationReason).toContain('Metrics within normal ranges');
    });
    (0, globals_1.it)('should increase max replicas for high traffic', () => {
        const metrics = {
            cpuUsagePercent: 80,
            memoryUsageBytes: 1024 * 1024 * 50,
            requestRateRPS: 1000, // High RPS
            p95LatencyMs: 100,
            errorRatePercent: 0,
            timestamp: mockDate,
        };
        const policies = generator.generatePolicies('test-service', metrics);
        // 1000 RPS / 50 = 20 replicas + 2 = 22
        (0, globals_1.expect)(policies.hpa.spec.maxReplicas).toBeGreaterThan(10);
        (0, globals_1.expect)(policies.recommendationReason).toContain('High CPU usage');
        (0, globals_1.expect)(policies.recommendationReason).toContain('High Request Rate');
    });
    (0, globals_1.it)('should adjust VPA min memory for high memory usage', () => {
        const metrics = {
            cpuUsagePercent: 50,
            memoryUsageBytes: 1024 * 1024 * 300, // 300MB
            requestRateRPS: 50,
            p95LatencyMs: 100,
            errorRatePercent: 0,
            timestamp: mockDate,
        };
        const policies = generator.generatePolicies('test-service', metrics);
        const memoryPolicy = policies.vpa.spec.resourcePolicy?.containerPolicies[0].minAllowed?.memory;
        (0, globals_1.expect)(memoryPolicy).toBe('256Mi');
        (0, globals_1.expect)(policies.recommendationReason).toContain('High Memory usage');
    });
    (0, globals_1.it)('should scale up for high latency', () => {
        const metrics = {
            cpuUsagePercent: 50,
            memoryUsageBytes: 1024 * 1024 * 50,
            requestRateRPS: 50,
            p95LatencyMs: 1000, // 1000ms latency
            errorRatePercent: 0,
            timestamp: mockDate,
        };
        const policies = generator.generatePolicies('test-service', metrics);
        // Default max is 10. Latency > 500ms triggers 1.5x multiplier.
        // So 10 * 1.5 = 15.
        (0, globals_1.expect)(policies.hpa.spec.maxReplicas).toBe(15);
        (0, globals_1.expect)(policies.recommendationReason).toContain('High Latency');
    });
});
