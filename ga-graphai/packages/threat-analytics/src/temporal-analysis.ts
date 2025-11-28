import type { BehaviorEvent, TemporalInsight } from './types';

export class TemporalAnalyzer {
  private readonly history = new Map<string, BehaviorEvent[]>();

  observe(event: BehaviorEvent): TemporalInsight {
    const events = this.history.get(event.entityId) ?? [];
    events.push(event);
    const sorted = events.sort((a, b) => a.timestamp - b.timestamp).slice(-20);
    this.history.set(event.entityId, sorted);

    let dwellTimeMs: number | undefined;
    let burstRate: number | undefined;
    if (sorted.length >= 2) {
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      dwellTimeMs = last.timestamp - first.timestamp;
      const durationSeconds = Math.max((last.timestamp - first.timestamp) / 1000, 1);
      burstRate = Number(((sorted.length - 1) / durationSeconds).toFixed(3));
    }

    return {
      entityId: event.entityId,
      dwellTimeMs,
      burstRate,
      recentActivity: [...sorted],
    } satisfies TemporalInsight;
  }
}
