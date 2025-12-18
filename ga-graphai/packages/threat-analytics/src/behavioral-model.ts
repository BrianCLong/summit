import type { BehaviorEvent, BehaviorInsight } from './types';

interface BehaviorStat {
  count: number;
  mean: number;
  m2: number;
  lastTimestamp: number;
}

export interface BehaviorModelOptions {
  windowSize?: number;
  zThreshold?: number;
  minObservations?: number;
}

const DEFAULTS: Required<BehaviorModelOptions> = {
  windowSize: 50,
  zThreshold: 2.4,
  minObservations: 5,
};

function computeZScore(stat: BehaviorStat, value: number): number {
  if (stat.count < 2) {
    return 0;
  }
  const variance = stat.m2 / (stat.count - 1);
  const std = Math.sqrt(variance);
  if (std === 0) {
    return 0;
  }
  return (value - stat.mean) / std;
}

export class BehavioralModel {
  private readonly options: Required<BehaviorModelOptions>;

  private readonly stats = new Map<string, BehaviorStat[]>();

  constructor(options?: BehaviorModelOptions) {
    this.options = { ...DEFAULTS, ...options };
  }

  analyze(event: BehaviorEvent): BehaviorInsight | undefined {
    if (event.value === undefined) {
      return undefined;
    }
    const key = `${event.entityId}:${event.action}`;
    const windows = this.stats.get(key) ?? [];
    const current: BehaviorStat = windows[windows.length - 1] ?? {
      count: 0,
      mean: 0,
      m2: 0,
      lastTimestamp: event.timestamp,
    };

    const delta = event.value - current.mean;
    const count = current.count + 1;
    const mean = current.mean + delta / count;
    const m2 = current.m2 + delta * (event.value - mean);
    const updated: BehaviorStat = {
      count,
      mean,
      m2,
      lastTimestamp: event.timestamp,
    };
    windows.push(updated);
    if (windows.length > this.options.windowSize) {
      windows.shift();
    }
    this.stats.set(key, windows);

    if (updated.count < this.options.minObservations) {
      return undefined;
    }

    const zScore = computeZScore(updated, event.value);
    if (Math.abs(zScore) < this.options.zThreshold) {
      return undefined;
    }

    const trend = zScore > 0 ? 'spike' : 'drop';
    return {
      entityId: event.entityId,
      action: event.action,
      score: Number(Math.min(Math.abs(zScore) / 6, 1).toFixed(2)),
      confidence: Number(Math.min(updated.count / this.options.windowSize, 1).toFixed(2)),
      rationale: [
        `z-score ${zScore.toFixed(2)} exceeds threshold ${this.options.zThreshold}`,
        `mean=${updated.mean.toFixed(2)} count=${updated.count}`,
      ],
      zScore: Number(zScore.toFixed(2)),
      trend,
    } satisfies BehaviorInsight;
  }
}
