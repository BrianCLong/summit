import { percentile } from 'common-types';

export class MetricsRecorder {
  constructor() {
    this.latencies = [];
    this.costs = [];
    this.qualities = [];
    this.cacheHits = 0;
    this.total = 0;
  }

  record({ latency, cost, quality, cacheHit }) {
    if (Number.isFinite(latency)) {
      this.latencies.push(latency);
    }
    if (Number.isFinite(cost)) {
      this.costs.push(cost);
    }
    if (Number.isFinite(quality)) {
      this.qualities.push(quality);
    }
    if (cacheHit) {
      this.cacheHits += 1;
    }
    this.total += 1;
  }

  snapshot() {
    return {
      p50Latency: percentile(this.latencies, 0.5),
      p95Latency: percentile(this.latencies, 0.95),
      avgCost:
        this.costs.length === 0
          ? 0
          : this.costs.reduce((a, b) => a + b, 0) / this.costs.length,
      avgQuality:
        this.qualities.length === 0
          ? 0
          : this.qualities.reduce((a, b) => a + b, 0) / this.qualities.length,
      cacheHitRate: this.total === 0 ? 0 : this.cacheHits / this.total,
    };
  }
}
