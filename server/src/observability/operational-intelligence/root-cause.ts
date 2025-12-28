// @ts-nocheck
import { CorrelatedSignalGroup, RootCauseInsight, ServiceDependencyEdge } from './types.js';

interface AnalyzerOptions {
  latencyPenaltyMs?: number;
  errorWeight?: number;
  dependencyBonus?: number;
}

const DEFAULTS: Required<AnalyzerOptions> = {
  latencyPenaltyMs: 500,
  errorWeight: 2.5,
  dependencyBonus: 0.2,
};

function normalizeScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function computeServiceScore(group: CorrelatedSignalGroup, service: string, options: Required<AnalyzerOptions>) {
  const related = group.signals.filter((signal) => signal.service === service);
  if (!related.length) return 0;

  const errors = related.filter((signal) => signal.kind === 'log' && signal.severity === 'error');
  const traces = related.filter((signal): signal is { durationMs: number; status?: string } => signal.kind === 'trace');
  const metrics = related.filter((signal): signal is { value: number } => signal.kind === 'metric');

  const latencyScore = normalizeScore(
    percentile(
      traces.map((trace) => trace.durationMs),
      0.95,
    ) / options.latencyPenaltyMs,
  );

  const errorScore = normalizeScore((errors.length / related.length) * options.errorWeight);
  const metricDeviation = normalizeScore(
    metrics.reduce((acc, metric) => acc + (metric.value > (metric as any).expected?.p95 ? 1 : 0), 0) / Math.max(metrics.length, 1),
  );

  return normalizeScore(latencyScore * 0.4 + errorScore * 0.4 + metricDeviation * 0.2);
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export class RootCauseAnalyzer {
  private readonly options: Required<AnalyzerOptions>;
  private readonly dependencies: ServiceDependencyEdge[];

  constructor(dependencies: ServiceDependencyEdge[] = [], options: AnalyzerOptions = {}) {
    this.dependencies = dependencies;
    this.options = { ...DEFAULTS, ...options };
  }

  analyze(groups: CorrelatedSignalGroup[]): RootCauseInsight[] {
    const insights: RootCauseInsight[] = [];

    for (const group of groups) {
      const serviceScores: Record<string, number> = {};
      for (const service of group.services) {
        serviceScores[service] = computeServiceScore(group, service, this.options);
      }

      for (const edge of this.dependencies) {
        if (serviceScores[edge.to] && serviceScores[edge.from]) {
          serviceScores[edge.from] += serviceScores[edge.to] * edge.criticality * this.options.dependencyBonus;
        }
      }

      const entries = Object.entries(serviceScores).sort(([, a], [, b]) => b - a);
      if (!entries.length) continue;

      const [probableService, confidenceRaw] = entries[0];
      const contributingSignals = group.signals
        .filter((signal) => signal.service === probableService)
        .map((signal) => ({
          id: signal.id,
          kind: signal.kind,
          weight: signal.kind === 'log' ? 0.35 : signal.kind === 'trace' ? 0.4 : 0.25,
          detail:
            signal.kind === 'log'
              ? (signal as any).message ?? 'log'
              : signal.kind === 'trace'
                ? `duration=${(signal as any).durationMs}ms`
                : `${(signal as any).name}=${(signal as any).value}`,
        }))
        .slice(0, 5);

      const impacted = this.dependencies
        .filter((edge) => edge.from === probableService)
        .map((edge) => edge.to);

      const remediations = [
        'Check recent deploys and config changes',
        'Verify downstream dependency health via health endpoints',
        'Re-run synthetic checks against critical user journeys',
        'If persistent, trigger automated rollback or failover',
      ];

      insights.push({
        correlationId: group.correlationId,
        probableService,
        confidence: normalizeScore(confidenceRaw),
        contributingSignals,
        impactedServices: impacted,
        remediations,
      });
    }

    return insights.sort((a, b) => b.confidence - a.confidence);
  }
}
