"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureStore = void 0;
class FeatureStore {
    store = new Map();
    upsert(entry) {
        this.store.set(entry.key, entry);
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        const expiresAt = new Date(entry.createdAt).getTime() + entry.ttlMinutes * 60 * 1000;
        if (Date.now() > expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return {
            value: entry.value,
            version: entry.version,
            lineage: entry.lineage,
            sourceArtifacts: entry.sourceArtifacts,
            expiresAt: new Date(expiresAt).toISOString(),
        };
    }
    pendingExpiry(withinMinutes) {
        const cutoff = Date.now() + withinMinutes * 60 * 1000;
        return Array.from(this.store.values()).filter((entry) => {
            const expiresAt = new Date(entry.createdAt).getTime() + entry.ttlMinutes * 60 * 1000;
            return expiresAt <= cutoff;
        });
    }
    async backfill(job) {
        const results = [];
        for (const input of job.inputs) {
            const computed = await job.compute(input);
            const existing = this.store.get(computed.key);
            if (existing && !job.allowOverwrite) {
                continue;
            }
            this.upsert(computed);
            results.push(computed);
        }
        return results;
    }
}
exports.FeatureStore = FeatureStore;
