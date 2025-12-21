import { FunnelMetrics, FunnelStageEvent } from './types.js';

export class AnalyticsService {
  private events: FunnelStageEvent[] = [];

  record(event: FunnelStageEvent): void {
    this.events.push(event);
  }

  getEventsForEvaluation(evaluationId: string): FunnelStageEvent[] {
    return this.events.filter((e) => e.evaluationId === evaluationId);
  }

  getFunnelMetrics(): FunnelMetrics {
    const stages = ['requested', 'provisioned', 'run-triggered', 'report-ready', 'deprovisioned'] as const;
    const counts: Record<string, number> = {};
    stages.forEach((stage) => {
      counts[stage] = this.events.filter((e) => e.stage === stage && e.success).length;
    });

    const dropOff: Record<string, number> = {};
    for (let i = 0; i < stages.length - 1; i += 1) {
      const current = counts[stages[i]];
      const next = counts[stages[i + 1]];
      dropOff[`${stages[i]}->${stages[i + 1]}`] = current === 0 ? 0 : Math.max(0, ((current - next) / current) * 100);
    }

    const completionRate = counts['requested'] === 0 ? 0 : counts['report-ready'] / counts['requested'];

    const averageTimeToValueMinutes = this.calculateAverageTimeToValue();

    return {
      stages: counts,
      dropOff,
      averageTimeToValueMinutes,
      completionRate,
    };
  }

  private calculateAverageTimeToValue(): number {
    const grouped = this.groupByEvaluation();
    const durations: number[] = [];

    grouped.forEach((events) => {
      const requested = events.find((e) => e.stage === 'requested');
      const reportReady = events.find((e) => e.stage === 'report-ready');
      if (requested && reportReady) {
        const diff = reportReady.occurredAt.getTime() - requested.occurredAt.getTime();
        durations.push(diff / 60000);
      }
    });

    if (durations.length === 0) {
      return 0;
    }

    const total = durations.reduce((acc, val) => acc + val, 0);
    return parseFloat((total / durations.length).toFixed(2));
  }

  private groupByEvaluation(): Map<string, FunnelStageEvent[]> {
    const grouped = new Map<string, FunnelStageEvent[]>();
    this.events.forEach((event) => {
      const bucket = grouped.get(event.evaluationId) ?? [];
      bucket.push(event);
      grouped.set(event.evaluationId, bucket);
    });
    return grouped;
  }
}
