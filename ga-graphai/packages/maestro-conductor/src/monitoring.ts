import type { HealthSignal, HealthSnapshot } from './types';

export class HealthMonitor {
  private readonly snapshots = new Map<string, HealthSnapshot>();

  private readonly history = new Map<string, Map<string, number[]>>();

  constructor(private readonly historyWindow = 50) {}

  ingest(signal: HealthSignal): HealthSnapshot {
    const existing = this.snapshots.get(signal.assetId);
    const metrics = existing ? { ...existing.metrics } : {};
    metrics[signal.metric] = signal.value;

    const annotations = existing ? [...existing.annotations] : [];
    if (signal.unit) {
      annotations.push(`unit:${signal.metric}:${signal.unit}`);
    }

    const snapshot: HealthSnapshot = {
      assetId: signal.assetId,
      lastUpdated: signal.timestamp,
      metrics,
      annotations: [...new Set(annotations)]
    };

    this.snapshots.set(signal.assetId, snapshot);
    this.pushHistory(signal.assetId, signal.metric, signal.value);
    return snapshot;
  }

  getSnapshot(assetId: string): HealthSnapshot | undefined {
    return this.snapshots.get(assetId);
  }

  listSnapshots(): HealthSnapshot[] {
    return [...this.snapshots.values()].sort((a, b) =>
      a.assetId.localeCompare(b.assetId)
    );
  }

  getHistory(assetId: string, metric: string): number[] {
    const byMetric = this.history.get(assetId);
    if (!byMetric) {
      return [];
    }
    return [...(byMetric.get(metric) ?? [])];
  }

  private pushHistory(assetId: string, metric: string, value: number): void {
    const byMetric = this.history.get(assetId) ?? new Map<string, number[]>();
    const series = byMetric.get(metric) ?? [];
    series.push(value);
    if (series.length > this.historyWindow) {
      series.shift();
    }
    byMetric.set(metric, series);
    this.history.set(assetId, byMetric);
  }
}
