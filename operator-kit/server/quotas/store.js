"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryQuotaStore = void 0;
const luxon_1 = require("luxon");
// Simple memory fallback. For prod, implement Redis with time‑bucket keys.
class MemoryQuotaStore {
    e = [];
    async record(model, unit, amount) {
        this.e.push({ ts: Date.now(), model, unit, amount });
    }
    async usedInRolling(model, unit, window) {
        const cutoff = Date.now() - window.as('milliseconds');
        return this.e
            .filter((x) => x.model === model && x.unit === unit && x.ts >= cutoff)
            .reduce((a, b) => a + b.amount, 0);
    }
    async usedInFixed(model, unit, period, tz) {
        const now = luxon_1.DateTime.now().setZone(tz);
        const start = period === 'daily' ? now.startOf('day') : now.startOf('week');
        const end = period === 'daily' ? now.endOf('day') : now.endOf('week');
        const used = this.e
            .filter((x) => x.model === model &&
            x.unit === unit &&
            x.ts >= start.toMillis() &&
            x.ts <= end.toMillis())
            .reduce((a, b) => a + b.amount, 0);
        return { used, windowStart: start.toISO(), windowEnd: end.toISO() };
    }
}
exports.MemoryQuotaStore = MemoryQuotaStore;
