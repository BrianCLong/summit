export interface PerfSnapshot {
  p50: number;
  p95: number;
  p99: number;
  throughput: number;
  errorRate: number;
}

export interface PerfGateResult {
  passed: boolean;
  regressions: string[];
}

export function evaluatePerformance(baseline: PerfSnapshot, latest: PerfSnapshot): PerfGateResult {
  const regressions: string[] = [];
  const threshold = 0.1;
  const compare = (
    name: string,
    base: number,
    next: number,
    higherIsBetter = false,
  ) => {
    if (higherIsBetter) {
      if (next < base * (1 - threshold)) regressions.push(`${name} dropped`);
    } else if (next > base * (1 + threshold)) {
      regressions.push(`${name} regressed`);
    }
  };

  compare('p50', baseline.p50, latest.p50);
  compare('p95', baseline.p95, latest.p95);
  compare('p99', baseline.p99, latest.p99);
  compare('errorRate', baseline.errorRate, latest.errorRate);
  compare('throughput', baseline.throughput, latest.throughput, true);

  return { passed: regressions.length === 0, regressions };
}
