import { TripletState } from './types.js';

export class ResilienceForecaster {
  private readonly history = new Map<string, number[]>();

  constructor(private readonly window = 6) {}

  update(state: TripletState): number {
    const entries = this.history.get(state.id) ?? [];
    entries.push(state.resilienceScore);
    if (entries.length > this.window) {
      entries.shift();
    }
    this.history.set(state.id, entries);

    const slope = this.estimateSlope(entries);
    const projected = Math.max(0, Math.min(2, state.resilienceScore + slope * 0.5));
    return Number(projected.toFixed(4));
  }

  private estimateSlope(entries: number[]): number {
    if (entries.length < 2) return 0;
    const n = entries.length;
    const meanX = (n - 1) / 2;
    const meanY = entries.reduce((sum, value) => sum + value, 0) / n;
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i += 1) {
      const x = i - meanX;
      const y = entries[i] - meanY;
      numerator += x * y;
      denominator += x * x;
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }
}
