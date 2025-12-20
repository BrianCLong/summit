/**
 * Metrics endpoint health tests
 * Ensures Prometheus metrics are properly exposed
 */
import { describe, it, expect } from '@jest/globals';
import { registry } from '../../src/observability/metrics';

describe('Metrics Health', () => {
  it('should export metrics in Prometheus format', async () => {
    const metrics = await registry.metrics();

    expect(metrics).toBeTruthy();
    expect(typeof metrics).toBe('string');
    expect(metrics.length).toBeGreaterThan(0);
  });

  it('should include default Node.js metrics', async () => {
    const metrics = await registry.metrics();

    // Check for standard Node.js metrics
    expect(metrics).toContain('process_cpu_user_seconds_total');
    expect(metrics).toContain('nodejs_heap_size_total_bytes');
    expect(metrics).toContain('nodejs_version_info');
  });

  it('should include application-specific metrics', async () => {
    const metrics = await registry.metrics();

    // Check for our custom metrics
    expect(metrics).toContain('intelgraph_jobs_processed_total');
    expect(metrics).toContain('intelgraph_outbox_sync_latency_seconds');
    expect(metrics).toContain('intelgraph_active_connections');
  });

  it('should have proper metric format', async () => {
    const metrics = await registry.metrics();

    // Prometheus format validation
    const lines = metrics.split('\n');
    const helpLines = lines.filter(line => line.startsWith('# HELP'));
    const typeLines = lines.filter(line => line.startsWith('# TYPE'));

    expect(helpLines.length).toBeGreaterThan(0);
    expect(typeLines.length).toBeGreaterThan(0);
  });
});
