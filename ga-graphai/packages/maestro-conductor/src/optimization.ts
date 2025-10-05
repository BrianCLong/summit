import type {
  AssetPerformanceSnapshot,
  OptimizationRecommendation,
  OptimizationSample
} from './types';

class RollingSeries {
  private readonly values: number[] = [];

  constructor(private readonly size: number) {}

  push(value: number): void {
    this.values.push(value);
    if (this.values.length > this.size) {
      this.values.shift();
    }
  }

  get length(): number {
    return this.values.length;
  }

  get latest(): number | undefined {
    if (this.values.length === 0) {
      return undefined;
    }
    return this.values[this.values.length - 1];
  }

  get mean(): number | undefined {
    if (this.values.length === 0) {
      return undefined;
    }
    return this.values.reduce((sum, value) => sum + value, 0) / this.values.length;
  }

  get min(): number | undefined {
    if (this.values.length === 0) {
      return undefined;
    }
    return Math.min(...this.values);
  }

  get max(): number | undefined {
    if (this.values.length === 0) {
      return undefined;
    }
    return Math.max(...this.values);
  }
}

interface MetricSeries {
  latency: RollingSeries;
  cost: RollingSeries;
  throughput: RollingSeries;
  errorRate: RollingSeries;
  saturation: RollingSeries;
  computeUtilization: RollingSeries;
  lastUpdated?: Date;
}

function createSeries(window: number): MetricSeries {
  return {
    latency: new RollingSeries(window),
    cost: new RollingSeries(window),
    throughput: new RollingSeries(window),
    errorRate: new RollingSeries(window),
    saturation: new RollingSeries(window),
    computeUtilization: new RollingSeries(window)
  };
}

export interface CostLatencyOptimizerOptions {
  windowSize?: number;
  latencyThresholdMs?: number;
  errorRateThreshold?: number;
  saturationThreshold?: number;
}

const DEFAULT_OPTIONS: Required<CostLatencyOptimizerOptions> = {
  windowSize: 30,
  latencyThresholdMs: 400,
  errorRateThreshold: 0.05,
  saturationThreshold: 0.75
};

export class CostLatencyOptimizer {
  private readonly metrics = new Map<string, MetricSeries>();

  private readonly options: Required<CostLatencyOptimizerOptions>;

  constructor(options?: CostLatencyOptimizerOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  update(sample: OptimizationSample): void {
    const series = this.metrics.get(sample.assetId) ?? createSeries(this.options.windowSize);
    if (sample.latencyMs !== undefined) {
      series.latency.push(sample.latencyMs);
    }
    if (sample.costPerHour !== undefined) {
      series.cost.push(sample.costPerHour);
    }
    if (sample.throughput !== undefined) {
      series.throughput.push(sample.throughput);
    }
    if (sample.errorRate !== undefined) {
      series.errorRate.push(sample.errorRate);
    }
    if (sample.saturation !== undefined) {
      series.saturation.push(sample.saturation);
    }
    if (sample.computeUtilization !== undefined) {
      series.computeUtilization.push(sample.computeUtilization);
    }
    series.lastUpdated = sample.timestamp;
    this.metrics.set(sample.assetId, series);
  }

  getSnapshot(assetId: string): AssetPerformanceSnapshot | undefined {
    const series = this.metrics.get(assetId);
    if (!series || !series.lastUpdated) {
      return undefined;
    }
    return {
      assetId,
      latencyMs: series.latency.latest,
      costPerHour: series.cost.latest,
      throughput: series.throughput.latest,
      errorRate: series.errorRate.latest,
      saturation: series.saturation.latest,
      computeUtilization: series.computeUtilization.latest,
      lastUpdated: series.lastUpdated,
      sampleCount: Math.max(
        series.latency.length,
        series.cost.length,
        series.throughput.length,
        series.errorRate.length,
        series.saturation.length,
        series.computeUtilization.length
      )
    };
  }

  listSnapshots(): AssetPerformanceSnapshot[] {
    return [...this.metrics.entries()]
      .map(([assetId]) => this.getSnapshot(assetId))
      .filter((snapshot): snapshot is AssetPerformanceSnapshot => Boolean(snapshot))
      .sort((a, b) => a.assetId.localeCompare(b.assetId));
  }

  getRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    for (const [assetId, series] of this.metrics.entries()) {
      if (!series.lastUpdated) {
        continue;
      }
      const actions: string[] = [];
      const justification: string[] = [];

      const latencyMean = series.latency.mean;
      const latencyLatest = series.latency.latest;
      if (
        latencyMean !== undefined &&
        latencyLatest !== undefined &&
        (latencyLatest > this.options.latencyThresholdMs ||
          latencyLatest > latencyMean * 1.35)
      ) {
        actions.push('scale-out');
        actions.push('enable-adaptive-routing');
        justification.push(
          `latency spiked to ${latencyLatest.toFixed(1)}ms vs avg ${latencyMean.toFixed(1)}ms`
        );
      }

      const errorRate = series.errorRate.latest ?? 0;
      if (errorRate > this.options.errorRateThreshold) {
        actions.push('deploy-fallback');
        actions.push('activate-runbook');
        justification.push(`error rate ${Math.round(errorRate * 100)}% above threshold`);
      }

      const saturation = series.saturation.latest ?? 0;
      const utilization = series.computeUtilization.latest ?? 0;
      if (saturation > this.options.saturationThreshold && utilization > 0.75) {
        actions.push('rebalance-workload');
        justification.push(
          `saturation ${Math.round(saturation * 100)}% indicates capacity pressure`
        );
      }

      const costMean = series.cost.mean;
      if (
        costMean !== undefined &&
        series.cost.latest !== undefined &&
        saturation < 0.4 &&
        series.cost.latest > costMean * 1.25
      ) {
        actions.push('scale-in');
        justification.push('cost increasing while capacity is underutilised');
      }

      if (actions.length === 0) {
        continue;
      }

      const confidence = Math.min(1, Math.max(series.latency.length, series.cost.length) / 10);
      recommendations.push({
        assetId,
        actions: [...new Set(actions)],
        justification: justification.join('; '),
        confidence: Number(confidence.toFixed(2))
      });
    }
    return recommendations;
  }
}
