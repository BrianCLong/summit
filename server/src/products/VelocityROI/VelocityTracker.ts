
export interface DevMetric {
    timestamp: number;
    prCount: number;
    avgCycleTimeHours: number;
    contextSwitches: number;
    aiAssistanceRate: number; // 0.0 to 1.0
}

export class VelocityTracker {
    private metrics: DevMetric[] = [];

    /**
     * Ingests a new metric point.
     */
    addMetric(metric: DevMetric) {
        this.metrics.push(metric);
    }

    /**
     * Returns the average velocity (PRs/day) over the tracked period.
     */
    getAverageVelocity(): number {
        if (this.metrics.length === 0) return 0;
        const totalPRs = this.metrics.reduce((acc, m) => acc + m.prCount, 0);
        return totalPRs / this.metrics.length;
    }

    /**
     * Returns the reduction in context switches compared to a baseline.
     * @param baselineSwitches Baseline context switches per day.
     */
    getContextSwitchReduction(baselineSwitches: number): number {
        if (this.metrics.length === 0) return 0;
        const currentAvg = this.metrics.reduce((acc, m) => acc + m.contextSwitches, 0) / this.metrics.length;
        return ((baselineSwitches - currentAvg) / baselineSwitches) * 100;
    }

    getMetrics(): DevMetric[] {
        return this.metrics;
    }
}
