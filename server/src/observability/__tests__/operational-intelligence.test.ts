import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ObservabilityFabric } from '../operational-intelligence/fabric.js';
import { RootCauseAnalyzer } from '../operational-intelligence/root-cause.js';
import { AnomalyPredictor } from '../operational-intelligence/predictive.js';
import { FailureSimulator } from '../operational-intelligence/failure-simulator.js';
import { FailureScenario, MetricSignal, ObservabilitySignal, ServiceDependencyEdge } from '../operational-intelligence/types.js';

const now = Date.now();

function buildMetric(partial: Partial<MetricSignal> = {}): MetricSignal {
  return {
    id: `metric-${Math.random()}`,
    kind: 'metric',
    name: 'latency_ms',
    value: 120,
    service: 'search-api',
    timestamp: now,
    expected: { p95: 100 },
    ...partial,
  };
}

function buildLog(service: string, severity: 'info' | 'warn' | 'error' | 'critical', correlationId: string): ObservabilitySignal {
  return {
    id: `log-${Math.random()}`,
    kind: 'log',
    message: `${service} message`,
    service,
    severity,
    timestamp: now,
    correlationId,
  } as ObservabilitySignal;
}

function buildTrace(service: string, durationMs: number, correlationId: string, traceId?: string): ObservabilitySignal {
  return {
    id: `trace-${Math.random()}`,
    kind: 'trace',
    spanId: 'span-1',
    traceId: traceId ?? correlationId,
    service,
    durationMs,
    operation: 'op',
    timestamp: now,
    correlationId,
  } as ObservabilitySignal;
}

describe('ObservabilityFabric', () => {
  it('correlates signals and computes health snapshot', () => {
    const fabric = new ObservabilityFabric();
    fabric.ingest(buildLog('search-api', 'error', 'corr-1'));
    fabric.ingest(buildTrace('search-api', 550, 'corr-1'));
    fabric.ingest(buildMetric({ service: 'search-api', value: 200, correlationId: 'corr-1' }));

    const groups = fabric.getCorrelatedGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].services.has('search-api')).toBe(true);

    const health = fabric.getHealthSnapshot();
    expect(health.errorRate).toBeGreaterThan(0);
    expect(health.serviceHealth['search-api'].latencyP95).toBeGreaterThan(0);
  });
});

describe('RootCauseAnalyzer', () => {
  it('identifies probable service using correlated signals and dependencies', () => {
    const fabric = new ObservabilityFabric();
    fabric.ingest(buildLog('edge-proxy', 'error', 'corr-2'));
    fabric.ingest(buildTrace('edge-proxy', 800, 'corr-2'));
    fabric.ingest(buildMetric({ service: 'edge-proxy', correlationId: 'corr-2', value: 300 }));
    fabric.ingest(buildLog('search-api', 'error', 'corr-2'));
    fabric.ingest(buildTrace('search-api', 150, 'corr-2'));

    const dependencies: ServiceDependencyEdge[] = [
      { from: 'edge-proxy', to: 'search-api', criticality: 0.8 },
    ];
    const analyzer = new RootCauseAnalyzer(dependencies);
    const insights = analyzer.analyze(fabric.getCorrelatedGroups());

    expect(insights[0].probableService).toBe('edge-proxy');
    expect(insights[0].confidence).toBeGreaterThan(0);
    expect(insights[0].impactedServices).toContain('search-api');
  });
});

describe('AnomalyPredictor', () => {
  it('raises anomaly when value deviates from EMA baseline', () => {
    const predictor = new AnomalyPredictor(0.5, 0.5);
    const baseline = buildMetric({ value: 10, timestamp: now - 1000, correlationId: 'corr-3' });
    const moderate = buildMetric({ value: 12, timestamp: now - 500, correlationId: 'corr-3' });
    const spike = buildMetric({ value: 40, timestamp: now, correlationId: 'corr-3' });

    predictor.ingest(baseline);
    predictor.ingest(moderate);
    const prediction = predictor.ingest(spike);

    expect(prediction.isLikelyAnomaly).toBe(true);
    expect(prediction.probability).toBeGreaterThan(0.5);
  });
});

describe('FailureSimulator', () => {
  it('evaluates drill steps against correlated signals', () => {
    const fabric = new ObservabilityFabric();
    const correlationId = 'corr-4';
    fabric.ingest(buildLog('dr-db', 'error', correlationId));
    fabric.ingest(buildTrace('dr-db', 900, correlationId));

    const scenario: FailureScenario = {
      id: 'drill-1',
      name: 'DB failover runbook',
      owner: 'oncall',
      blastRadius: 'service',
      expectedRecoveryMinutes: 15,
      steps: [
        {
          description: 'Detect degraded DB latency',
          expectedSignals: [
            { service: 'dr-db', kind: 'trace' },
            { service: 'dr-db', kind: 'log', severity: 'error' },
          ],
          successCriteria: 'latency observed and error surfaced',
        },
      ],
    };

    const simulator = new FailureSimulator(fabric);
    const result = simulator.simulate(scenario);

    expect(result.completed).toBe(true);
    expect(result.outcomes[0].matchedSignals).toHaveLength(2);
    expect(result.recoveryEtaMinutes).toBe(15);
  });
});
