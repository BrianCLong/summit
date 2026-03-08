"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaStore = void 0;
class QuotaStore {
    counters = new Map();
    uniqueKeys = new Map();
    apiWindows = new Map();
    reset() {
        this.counters.clear();
        this.uniqueKeys.clear();
        this.apiWindows.clear();
    }
    getCounter(tenantId) {
        if (!this.counters.has(tenantId)) {
            this.counters.set(tenantId, {
                storageBytes: 0,
                evidenceCount: 0,
                exportCount: 0,
                jobConcurrency: 0,
                apiRequests: 0,
            });
        }
        return this.counters.get(tenantId);
    }
    getUniqueTracker(tenantId, category) {
        if (!this.uniqueKeys.has(tenantId)) {
            this.uniqueKeys.set(tenantId, new Map());
        }
        const tenantMap = this.uniqueKeys.get(tenantId);
        if (!tenantMap.has(category)) {
            tenantMap.set(category, new Set());
        }
        return tenantMap.get(category);
    }
    incrementDeterministic(tenantId, category, delta, uniqueKey) {
        const tracker = uniqueKey
            ? this.getUniqueTracker(tenantId, category)
            : null;
        if (tracker && tracker.has(uniqueKey)) {
            return this.getCounter(tenantId)[category];
        }
        const counter = this.getCounter(tenantId);
        counter[category] += delta;
        if (tracker) {
            tracker.add(uniqueKey);
        }
        return counter[category];
    }
    decrementJobConcurrency(tenantId, delta = 1) {
        const counter = this.getCounter(tenantId);
        counter.jobConcurrency = Math.max(0, counter.jobConcurrency - delta);
        return counter.jobConcurrency;
    }
    trackApiRequest(tenantId, windowMs) {
        const now = Date.now();
        const windowStart = now - (now % windowMs);
        const existing = this.apiWindows.get(tenantId);
        if (!existing || existing.windowStart !== windowStart) {
            this.apiWindows.set(tenantId, { windowStart, count: 0 });
        }
        const window = this.apiWindows.get(tenantId);
        window.count += 1;
        const counter = this.getCounter(tenantId);
        counter.apiRequests = window.count;
        return window;
    }
}
exports.QuotaStore = QuotaStore;
