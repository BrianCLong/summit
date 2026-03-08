"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const metrics_js_1 = require("../metrics.js");
(0, vitest_1.describe)('AutomationMetrics', () => {
    let metrics;
    (0, vitest_1.beforeEach)(() => {
        metrics = new metrics_js_1.AutomationMetrics();
    });
    (0, vitest_1.describe)('recordSubmission', () => {
        (0, vitest_1.it)('should record submission stats', () => {
            metrics.recordSubmission({
                autoCompletedFields: 8,
                totalFields: 10,
                reusedDataPoints: 5,
                manualOverrides: 2,
            });
            const today = new Date().toISOString().split('T')[0];
            const dayMetrics = metrics.getMetrics(today);
            (0, vitest_1.expect)(dayMetrics?.totalRequests).toBe(1);
            (0, vitest_1.expect)(dayMetrics?.autoCompletedFields).toBe(8);
            (0, vitest_1.expect)(dayMetrics?.reusedDataPoints).toBe(5);
            (0, vitest_1.expect)(dayMetrics?.manualInterventions).toBe(2);
        });
        (0, vitest_1.it)('should accumulate multiple submissions', () => {
            metrics.recordSubmission({
                autoCompletedFields: 5,
                totalFields: 10,
                reusedDataPoints: 3,
                manualOverrides: 1,
            });
            metrics.recordSubmission({
                autoCompletedFields: 7,
                totalFields: 8,
                reusedDataPoints: 4,
                manualOverrides: 0,
            });
            const today = new Date().toISOString().split('T')[0];
            const dayMetrics = metrics.getMetrics(today);
            (0, vitest_1.expect)(dayMetrics?.totalRequests).toBe(2);
            (0, vitest_1.expect)(dayMetrics?.autoCompletedFields).toBe(12);
            (0, vitest_1.expect)(dayMetrics?.reusedDataPoints).toBe(7);
            (0, vitest_1.expect)(dayMetrics?.manualInterventions).toBe(1);
        });
        (0, vitest_1.it)('should calculate time saved', () => {
            metrics.recordSubmission({
                autoCompletedFields: 10,
                totalFields: 10,
                reusedDataPoints: 0,
                manualOverrides: 0,
            });
            const today = new Date().toISOString().split('T')[0];
            const dayMetrics = metrics.getMetrics(today);
            // 10 fields * 30 seconds / 60 = 5 minutes
            (0, vitest_1.expect)(dayMetrics?.timeSavedMinutes).toBe(5);
        });
    });
    (0, vitest_1.describe)('recordProactiveResolution', () => {
        (0, vitest_1.it)('should record proactive resolution', () => {
            metrics.recordProactiveResolution(true);
            const today = new Date().toISOString().split('T')[0];
            const dayMetrics = metrics.getMetrics(today);
            (0, vitest_1.expect)(dayMetrics?.proactiveResolutions).toBe(1);
            (0, vitest_1.expect)(dayMetrics?.timeSavedMinutes).toBe(15);
        });
        (0, vitest_1.it)('should accumulate multiple resolutions', () => {
            metrics.recordProactiveResolution(true);
            metrics.recordProactiveResolution(true);
            metrics.recordProactiveResolution(false);
            const today = new Date().toISOString().split('T')[0];
            const dayMetrics = metrics.getMetrics(today);
            (0, vitest_1.expect)(dayMetrics?.proactiveResolutions).toBe(3);
            (0, vitest_1.expect)(dayMetrics?.timeSavedMinutes).toBe(30); // Only 2 auto-resolved
        });
    });
    (0, vitest_1.describe)('workload reduction calculation', () => {
        (0, vitest_1.it)('should calculate workload reduction percentage', () => {
            // 8 auto + 5 reused + 2 proactive = 15 automated
            // 3 manual
            // Total = 18, reduction = 15/18 = 83%
            metrics.recordSubmission({
                autoCompletedFields: 8,
                totalFields: 10,
                reusedDataPoints: 5,
                manualOverrides: 3,
            });
            metrics.recordProactiveResolution(true);
            metrics.recordProactiveResolution(true);
            const today = new Date().toISOString().split('T')[0];
            const dayMetrics = metrics.getMetrics(today);
            (0, vitest_1.expect)(dayMetrics?.workloadReductionPercent).toBeGreaterThan(70);
        });
    });
    (0, vitest_1.describe)('isTargetMet', () => {
        (0, vitest_1.it)('should return met=true when reduction >= 70%', () => {
            metrics.recordSubmission({
                autoCompletedFields: 70,
                totalFields: 100,
                reusedDataPoints: 10,
                manualOverrides: 10,
            });
            const result = metrics.isTargetMet();
            (0, vitest_1.expect)(result.met).toBe(true);
            (0, vitest_1.expect)(result.currentReduction).toBeGreaterThanOrEqual(70);
            (0, vitest_1.expect)(result.target).toBe(70);
        });
        (0, vitest_1.it)('should return met=false when reduction < 70%', () => {
            metrics.recordSubmission({
                autoCompletedFields: 30,
                totalFields: 100,
                reusedDataPoints: 10,
                manualOverrides: 60,
            });
            const result = metrics.isTargetMet();
            (0, vitest_1.expect)(result.met).toBe(false);
            (0, vitest_1.expect)(result.currentReduction).toBeLessThan(70);
        });
    });
    (0, vitest_1.describe)('getAggregatedMetrics', () => {
        (0, vitest_1.it)('should aggregate metrics across date range', () => {
            const today = new Date().toISOString().split('T')[0];
            metrics.recordSubmission({
                autoCompletedFields: 5,
                totalFields: 10,
                reusedDataPoints: 2,
                manualOverrides: 1,
            });
            metrics.recordProactiveResolution(true);
            const aggregate = metrics.getAggregatedMetrics(today, today);
            (0, vitest_1.expect)(aggregate.totalRequests).toBe(1);
            (0, vitest_1.expect)(aggregate.autoCompletedFields).toBe(5);
            (0, vitest_1.expect)(aggregate.proactiveResolutions).toBe(1);
        });
    });
    (0, vitest_1.describe)('getMetrics', () => {
        (0, vitest_1.it)('should return null for non-existent period', () => {
            const result = metrics.getMetrics('2020-01-01');
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
});
