import { describe, it, expect, beforeAll, afterAll } from 'jest';
import fetch from 'node-fetch';

const SLO_EXPORTER_URL = process.env.SLO_EXPORTER_URL || 'http://localhost:9090';

describe('SLO Exporter', () => {
  it('should expose /metrics endpoint', async () => {
    const response = await fetch(`${SLO_EXPORTER_URL}/metrics`);
    expect(response.ok).toBe(true);
    const text = await response.text();
    expect(text).toContain('graphql_operation_duration_seconds');
  });

  it('should expose /health endpoint', async () => {
    const response = await fetch(`${SLO_EXPORTER_URL}/health`);
    expect(response.ok).toBe(true);
    const json = await response.json();
    expect(json.status).toBe('ok');
  });

  it('should emit SLO compliance metrics', async () => {
    const response = await fetch(`${SLO_EXPORTER_URL}/metrics`);
    const text = await response.text();
    expect(text).toContain('slo_compliance_ratio');
    expect(text).toContain('metric_type="latency_p95"');
    expect(text).toContain('metric_type="error_rate"');
  });
});