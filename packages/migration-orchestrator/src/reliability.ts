export class ReliabilityManager {
  constructor(slo = {}) {
    this.slo = {
      errorRateBudget: slo.errorRateBudget ?? 0.001,
      latencyMsBudget: slo.latencyMsBudget ?? 500,
      driftBudget: slo.driftBudget ?? 0.001,
      rpoMinutes: slo.rpoMinutes ?? 5,
      rtoMinutes: slo.rtoMinutes ?? 30,
    };
    this.syntheticChecks = [];
    this.driftTrend = [];
  }

  recordSyntheticCheck(result) {
    this.syntheticChecks.push(result);
  }

  recordDrift(value) {
    this.driftTrend.push(value);
    if (this.driftTrend.length > 50) {
      this.driftTrend.shift();
    }
  }

  evaluateRollback(phase) {
    const reasons = [];
    const latestCheck = this.syntheticChecks.at(-1);
    if (latestCheck && (!latestCheck.passed || latestCheck.errorRate > this.slo.errorRateBudget)) {
      reasons.push("synthetic-check-failure");
    }
    const latestDrift = this.driftTrend.at(-1) ?? 0;
    if (latestDrift > this.slo.driftBudget) {
      reasons.push("drift-budget-breached");
    }
    if (phase === "ramp" && reasons.length > 0) {
      reasons.push("rollback-due-to-ramp-instability");
    }
    return { shouldRollback: reasons.length > 0, reasons };
  }

  getMetrics() {
    return {
      rpoMinutes: this.slo.rpoMinutes,
      rtoMinutes: this.slo.rtoMinutes,
      errorDriftTrend: [...this.driftTrend],
      syntheticChecks: [...this.syntheticChecks],
    };
  }
}
