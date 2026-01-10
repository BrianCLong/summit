export type QuotaCategory =
  | 'storageBytes'
  | 'evidenceCount'
  | 'exportCount'
  | 'jobConcurrency'
  | 'apiRequests'
  | 'receiptBacklog';

type QuotaCounters = {
  storageBytes: number;
  evidenceCount: number;
  exportCount: number;
  jobConcurrency: number;
  apiRequests: number;
  receiptBacklog: number;
};

type WindowCounter = {
  windowStart: number;
  count: number;
};

export class QuotaStore {
  private counters: Map<string, QuotaCounters> = new Map();
  private uniqueKeys: Map<string, Map<QuotaCategory, Set<string>>> = new Map();
  private apiWindows: Map<string, WindowCounter> = new Map();
  private stepWindows: Map<string, WindowCounter> = new Map();

  reset(): void {
    this.counters.clear();
    this.uniqueKeys.clear();
    this.apiWindows.clear();
    this.stepWindows.clear();
  }

  getCounter(tenantId: string): QuotaCounters {
    if (!this.counters.has(tenantId)) {
      this.counters.set(tenantId, {
        storageBytes: 0,
        evidenceCount: 0,
        exportCount: 0,
        jobConcurrency: 0,
        apiRequests: 0,
        receiptBacklog: 0,
      });
    }
    return this.counters.get(tenantId)!;
  }

  getUniqueTracker(tenantId: string, category: QuotaCategory): Set<string> {
    if (!this.uniqueKeys.has(tenantId)) {
      this.uniqueKeys.set(tenantId, new Map());
    }
    const tenantMap = this.uniqueKeys.get(tenantId)!;
    if (!tenantMap.has(category)) {
      tenantMap.set(category, new Set());
    }
    return tenantMap.get(category)!;
  }

  incrementDeterministic(
    tenantId: string,
    category: Exclude<QuotaCategory, 'apiRequests'>,
    delta: number,
    uniqueKey?: string,
  ): number {
    const tracker = uniqueKey
      ? this.getUniqueTracker(tenantId, category)
      : null;

    if (tracker && tracker.has(uniqueKey!)) {
      return this.getCounter(tenantId)[category];
    }

    const counter = this.getCounter(tenantId);
    counter[category] += delta;

    if (tracker) {
      tracker.add(uniqueKey!);
    }

    return counter[category];
  }

  decrementJobConcurrency(tenantId: string, delta = 1): number {
    const counter = this.getCounter(tenantId);
    counter.jobConcurrency = Math.max(0, counter.jobConcurrency - delta);
    return counter.jobConcurrency;
  }

  incrementReceiptBacklog(tenantId: string, delta = 1): number {
    const counter = this.getCounter(tenantId);
    counter.receiptBacklog += delta;
    return counter.receiptBacklog;
  }

  decrementReceiptBacklog(tenantId: string, delta = 1): number {
    const counter = this.getCounter(tenantId);
    counter.receiptBacklog = Math.max(0, counter.receiptBacklog - delta);
    return counter.receiptBacklog;
  }

  trackApiRequest(tenantId: string, windowMs: number): { count: number; windowStart: number } {
    const now = Date.now();
    const windowStart = now - (now % windowMs);
    const existing = this.apiWindows.get(tenantId);

    if (!existing || existing.windowStart !== windowStart) {
      this.apiWindows.set(tenantId, { windowStart, count: 0 });
    }

    const window = this.apiWindows.get(tenantId)!;
    window.count += 1;
    const counter = this.getCounter(tenantId);
    counter.apiRequests = window.count;
    return window;
  }

  trackStepThroughput(
    tenantId: string,
    windowMs: number,
  ): { count: number; windowStart: number } {
    const now = Date.now();
    const windowStart = now - (now % windowMs);
    const existing = this.stepWindows.get(tenantId);

    if (!existing || existing.windowStart !== windowStart) {
      this.stepWindows.set(tenantId, { windowStart, count: 0 });
    }

    const window = this.stepWindows.get(tenantId)!;
    window.count += 1;
    return window;
  }
}
