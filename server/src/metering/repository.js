"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantUsageDailyRepository = exports.TenantUsageDailyRepository = void 0;
class TenantUsageDailyRepository {
    store = new Map();
    async saveAll(rows) {
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
                    lastEventAt: existing.lastEventAt > row.lastEventAt ? existing.lastEventAt : row.lastEventAt,
                    correlationIds: Array.from(new Set([...existing.correlationIds, ...row.correlationIds])),
                });
            }
            else {
                this.store.set(key, row);
            }
        }
    }
    async list(tenantId, from, to) {
        let rows = Array.from(this.store.values());
        if (tenantId) {
            rows = rows.filter(r => r.tenantId === tenantId);
        }
        if (from) {
            rows = rows.filter(r => r.date >= from);
        }
        if (to) {
            rows = rows.filter(r => r.date <= to);
        }
        return rows;
    }
    async get(tenantId, date) {
        const key = `${tenantId}:${date}`;
        return this.store.get(key);
    }
    clear() {
        this.store.clear();
    }
}
exports.TenantUsageDailyRepository = TenantUsageDailyRepository;
exports.tenantUsageDailyRepository = new TenantUsageDailyRepository();
