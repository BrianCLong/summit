"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Metrics endpoint health tests
 * Ensures Prometheus metrics are properly exposed
 */
const globals_1 = require("@jest/globals");
const metrics_1 = require("../../src/observability/metrics");
(0, globals_1.describe)('Metrics Health', () => {
    (0, globals_1.it)('should export metrics in Prometheus format', async () => {
        const metrics = await metrics_1.registry.metrics();
        (0, globals_1.expect)(metrics).toBeTruthy();
        (0, globals_1.expect)(typeof metrics).toBe('string');
        (0, globals_1.expect)(metrics.length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('should include default Node.js metrics', async () => {
        const metrics = await metrics_1.registry.metrics();
        // Check for standard Node.js metrics
        (0, globals_1.expect)(metrics).toContain('process_cpu_user_seconds_total');
        (0, globals_1.expect)(metrics).toContain('nodejs_heap_size_total_bytes');
        (0, globals_1.expect)(metrics).toContain('nodejs_version_info');
    });
    (0, globals_1.it)('should include application-specific metrics', async () => {
        const metrics = await metrics_1.registry.metrics();
        // Check for our custom metrics
        (0, globals_1.expect)(metrics).toContain('intelgraph_jobs_processed_total');
        (0, globals_1.expect)(metrics).toContain('intelgraph_outbox_sync_latency_seconds');
        (0, globals_1.expect)(metrics).toContain('intelgraph_active_connections');
    });
    (0, globals_1.it)('should have proper metric format', async () => {
        const metrics = await metrics_1.registry.metrics();
        // Prometheus format validation
        const lines = metrics.split('\n');
        const helpLines = lines.filter(line => line.startsWith('# HELP'));
        const typeLines = lines.filter(line => line.startsWith('# TYPE'));
        (0, globals_1.expect)(helpLines.length).toBeGreaterThan(0);
        (0, globals_1.expect)(typeLines.length).toBeGreaterThan(0);
    });
});
