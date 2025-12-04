
import { RegionHealthStatus } from './multi-region-prober';

export interface SkewResult {
  detected: boolean;
  maxSkewMs: number;
  details: string;
}

export class RegionSkewDetector {
  private thresholdMs: number;

  constructor(thresholdMs: number = 200) {
    this.thresholdMs = thresholdMs;
  }

  /**
   * Detects latency skew between regions based on health probe results.
   */
  public detectLatencySkew(statuses: RegionHealthStatus[]): SkewResult {
    const healthy = statuses.filter(s => s.isHealthy);
    if (healthy.length < 2) {
      return {
        detected: false,
        maxSkewMs: 0,
        details: 'Not enough healthy regions to compare.',
      };
    }

    let minLatency = Infinity;
    let maxLatency = -Infinity;

    for (const status of healthy) {
      if (status.latencyMs < minLatency) minLatency = status.latencyMs;
      if (status.latencyMs > maxLatency) maxLatency = status.latencyMs;
    }

    const skew = maxLatency - minLatency;
    const detected = skew > this.thresholdMs;

    return {
      detected,
      maxSkewMs: skew,
      details: detected
        ? `Latency skew of ${skew}ms detected (Threshold: ${this.thresholdMs}ms).`
        : 'Latency skew within limits.',
    };
  }

  /**
   * Placeholder for data replication skew detection.
   * In a real scenario, this would compare replication lag metrics or watermarks.
   */
  public detectDataSkew(replicationLags: Record<string, number>): SkewResult {
     // Implementation would go here.
     return {
         detected: false,
         maxSkewMs: 0,
         details: "Not implemented"
     }
  }
}
