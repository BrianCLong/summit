import { TenantUsageDailyRow } from './schema.js';

export class TenantUsageDailyRepository {
  private store = new Map<string, TenantUsageDailyRow>();

  async saveAll(rows: TenantUsageDailyRow[]): Promise<void> {
    for (const row of rows) {
      const key = `${row.tenantId}:${row.date}`;
      const existing = this.store.get(key);
      if (existing) {
        this.store.set(key, {
          ...existing,
          ingestUnits: existing.ingestUnits + row.ingestUnits,
          queryCredits: existing.queryCredits + row.queryCredits,
          storageBytesEstimate: existing.storageBytesEstimate + row.storageBytesEstimate,
          activeSeats: Math.max(existing.activeSeats, row.activeSeats),
          lastEventAt:
            existing.lastEventAt > row.lastEventAt ? existing.lastEventAt : row.lastEventAt,
          correlationIds: Array.from(
            new Set([...existing.correlationIds, ...row.correlationIds]),
          ),
        });
      } else {
        this.store.set(key, row);
      }
    }
  }

  async list(): Promise<TenantUsageDailyRow[]> {
    return Array.from(this.store.values());
  }

  clear(): void {
    this.store.clear();
  }
}

export const tenantUsageDailyRepository = new TenantUsageDailyRepository();
