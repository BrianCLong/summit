import { TenantUsageDailyRow } from './schema.js';

export class TenantUsageDailyRepository {
  private store = new Map<string, TenantUsageDailyRow>();

  async saveAll(rows: TenantUsageDailyRow[]): Promise<void> {
    for (const row of rows) {
      const key = `${row.tenantId}:${row.date}`;
      // Since the pipeline manages the state for the day and sends the full snapshot,
      // we overwrite the existing entry.
      // Note: If we had multiple pipelines (horizontal scaling), we would need a different strategy (e.g. deltas in Redis).
      // For this single-instance implementation, overwrite is correct assuming pipeline loaded initial state.
      this.store.set(key, row);
    }
  }

  async get(tenantId: string, date: string): Promise<TenantUsageDailyRow | undefined> {
    return this.store.get(`${tenantId}:${date}`);
  }

  async list(tenantId?: string, fromDate?: string, toDate?: string): Promise<TenantUsageDailyRow[]> {
    let values = Array.from(this.store.values());
    if (tenantId) {
      values = values.filter(v => v.tenantId === tenantId);
    }
    if (fromDate) {
      values = values.filter(v => v.date >= fromDate);
    }
    if (toDate) {
      values = values.filter(v => v.date <= toDate);
    }
    return values;
  }

  clear(): void {
    this.store.clear();
  }
}

export const tenantUsageDailyRepository = new TenantUsageDailyRepository();
