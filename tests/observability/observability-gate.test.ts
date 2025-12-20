// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import {
  evaluateObservabilityGate,
  validateSloCoverage,
} from '../../scripts/observability/ga-observability-gate';

const fixtureConfigPath = path.resolve(__dirname, '../../config/slo.yaml');

describe('GA observability gate', () => {
  it('passes with the repository SLO source of truth', () => {
    const result = evaluateObservabilityGate(fixtureConfigPath);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when a production-critical service is missing', () => {
    const tmpPath = path.join(__dirname, 'tmp-slo.json');
    const minimalConfig = {
      version: 1,
      error_budget_policy: {
        window_days: 30,
        fast_burn_rate: 6,
        slow_burn_rate: 1,
        actions: ['freeze'],
      },
      services: [
        {
          name: 'api-gateway',
          tier: 'critical',
          metrics: {
            availability: 'http_requests_total',
            latency: 'http_request_duration_seconds',
            errors: 'errors_total',
          },
          objectives: {
            availability: 99.9,
            latency_p95_ms: 500,
            error_rate_percent: 0.5,
          },
        },
      ],
    };

    fs.writeFileSync(tmpPath, JSON.stringify(minimalConfig, null, 2));

    try {
      const result = validateSloCoverage(minimalConfig, [
        'api-gateway',
        'ingestion-pipeline',
      ]);
      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toContain('ingestion-pipeline');
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });
});
