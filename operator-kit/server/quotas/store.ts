import { DateTime, Duration } from 'luxon';
export interface QuotaState {
  remaining: number | null;
  used: number | null;
  cap: number | null;
  etaReset?: string;
  windowLabel?: string;
}
export interface QuotaStore {
  record(
    model: string,
    unit: 'messages' | 'tokens' | 'requests',
    amount: number,
  ): Promise<void>;
  usedInRolling(model: string, unit: string, window: Duration): Promise<number>;
  usedInFixed(
    model: string,
    unit: string,
    period: 'daily' | 'weekly',
    tz: string,
  ): Promise<{ used: number; windowStart: string; windowEnd: string }>;
}

// Simple memory fallback. For prod, implement Redis with time‑bucket keys.
export class MemoryQuotaStore implements QuotaStore {
  private e: Array<{
    ts: number;
    model: string;
    unit: string;
    amount: number;
  }> = [];
  async record(model: string, unit: any, amount: number) {
    this.e.push({ ts: Date.now(), model, unit, amount });
  }
  async usedInRolling(model: string, unit: string, window: Duration) {
    const cutoff = Date.now() - window.as('milliseconds');
    return this.e
      .filter((x) => x.model === model && x.unit === unit && x.ts >= cutoff)
      .reduce((a, b) => a + b.amount, 0);
  }
  async usedInFixed(
    model: string,
    unit: string,
    period: 'daily' | 'weekly',
    tz: string,
  ) {
    const now = DateTime.now().setZone(tz);
    const start = period === 'daily' ? now.startOf('day') : now.startOf('week');
    const end = period === 'daily' ? now.endOf('day') : now.endOf('week');
    const used = this.e
      .filter(
        (x) =>
          x.model === model &&
          x.unit === unit &&
          x.ts >= start.toMillis() &&
          x.ts <= end.toMillis(),
      )
      .reduce((a, b) => a + b.amount, 0);
    return { used, windowStart: start.toISO(), windowEnd: end.toISO() };
  }
}
