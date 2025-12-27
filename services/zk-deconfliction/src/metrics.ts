/**
 * Lightweight metrics collector for the ZK Deconfliction service.
 * Emits Prometheus-compatible plaintext for Grafana dashboards.
 */
export type DenialReason =
  | 'max_set_size'
  | 'empty_commitments'
  | 'invalid_commitment'
  | 'unsupported_mode'
  | 'rate_limited'
  | 'invalid_tenant';

interface HistogramBucket {
  le: number;
  count: number;
}

export class ZkdMetrics {
  private activeSessions = 0;
  private denials = new Map<DenialReason, number>();
  private latencyBuckets: HistogramBucket[] = [
    { le: 0.05, count: 0 },
    { le: 0.1, count: 0 },
    { le: 0.25, count: 0 },
    { le: 0.5, count: 0 },
    { le: 1, count: 0 },
    { le: 2, count: 0 },
    { le: 5, count: 0 },
  ];
  private latencySum = 0;
  private latencyCount = 0;

  incrementActive(): void {
    this.activeSessions += 1;
  }

  decrementActive(): void {
    this.activeSessions = Math.max(0, this.activeSessions - 1);
  }

  recordDenial(reason: DenialReason): void {
    const current = this.denials.get(reason) ?? 0;
    this.denials.set(reason, current + 1);
  }

  observeLatency(seconds: number): void {
    this.latencySum += seconds;
    this.latencyCount += 1;
    for (const bucket of this.latencyBuckets) {
      if (seconds <= bucket.le) {
        bucket.count += 1;
      }
    }
  }

  snapshotPrometheus(): string {
    const lines: string[] = [];

    lines.push(`# HELP zkd_sessions_active Active deconfliction sessions`);
    lines.push(`# TYPE zkd_sessions_active gauge`);
    lines.push(`zkd_sessions_active ${this.activeSessions}`);

    const totalDenials = Array.from(this.denials.values()).reduce(
      (sum, value) => sum + value,
      0,
    );
    lines.push(`# HELP zkd_denials_total Total denied or rejected requests`);
    lines.push(`# TYPE zkd_denials_total counter`);
    lines.push(`zkd_denials_total ${totalDenials}`);
    for (const [reason, count] of this.denials.entries()) {
      lines.push(
        `zkd_denials_reason_total{reason="${reason}"} ${count}`,
      );
    }

    lines.push(`# HELP zkd_latency_seconds Request latency`);
    lines.push(`# TYPE zkd_latency_seconds histogram`);
    let cumulative = 0;
    for (const bucket of this.latencyBuckets) {
      cumulative += bucket.count;
      lines.push(
        `zkd_latency_seconds_bucket{le="${bucket.le}"} ${cumulative}`,
      );
    }
    lines.push(
      `zkd_latency_seconds_bucket{le="+Inf"} ${this.latencyCount}`,
    );
    lines.push(`zkd_latency_seconds_sum ${this.latencySum.toFixed(6)}`);
    lines.push(`zkd_latency_seconds_count ${this.latencyCount}`);

    return lines.join('\n');
  }
}
