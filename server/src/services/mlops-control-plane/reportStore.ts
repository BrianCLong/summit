import type { AgentReport } from './types.js';

export interface ReportStore {
  get(entityId: string): Promise<AgentReport | null>;
  set(entityId: string, report: AgentReport, ttlSeconds: number): Promise<void>;
  flush(): Promise<number>;
}

export class InMemoryReportStore implements ReportStore {
  private store = new Map<string, { value: AgentReport; expiresAt: number }>();

  async get(entityId: string): Promise<AgentReport | null> {
    const entry = this.store.get(entityId);
    if (!entry) {
      return null;
    }
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(entityId);
      return null;
    }
    return entry.value;
  }

  async set(
    entityId: string,
    report: AgentReport,
    ttlSeconds: number,
  ): Promise<void> {
    this.store.set(entityId, {
      value: report,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async flush(): Promise<number> {
    const deleted = this.store.size;
    this.store.clear();
    return deleted;
  }
}

// TODO: Replace with vector-backed storage keyed by entity (pgvector/Qdrant).
