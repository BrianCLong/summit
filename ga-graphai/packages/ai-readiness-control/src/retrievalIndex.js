"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrievalIndex = void 0;
class RetrievalIndex {
    documents = new Map();
    add(doc) {
        if (this.documents.has(doc.id)) {
            throw new Error(`Document already indexed: ${doc.id}`);
        }
        this.documents.set(doc.id, doc);
    }
    markRefreshed(id, refreshedAt = new Date().toISOString()) {
        const existing = this.documents.get(id);
        if (!existing) {
            throw new Error(`Document not found: ${id}`);
        }
        this.documents.set(id, { ...existing, lastRefreshedAt: refreshedAt });
    }
    dueForRefresh(now = new Date().toISOString()) {
        const nowMs = new Date(now).getTime();
        return Array.from(this.documents.values()).filter((doc) => {
            if (!doc.lastRefreshedAt)
                return true;
            const deltaMinutes = (nowMs - new Date(doc.lastRefreshedAt).getTime()) / (1000 * 60);
            return deltaMinutes >= doc.refreshIntervalMinutes;
        });
    }
    get(id) {
        return this.documents.get(id);
    }
}
exports.RetrievalIndex = RetrievalIndex;
