"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceTracker = void 0;
class ProvenanceTracker {
    entries = new Map();
    record(entry) {
        if (!entry.artifactIds.length) {
            throw new Error('Provenance requires at least one source artifact id');
        }
        this.entries.set(entry.outputId, entry);
    }
    attachFeedback(outputId, feedback) {
        const existing = this.entries.get(outputId);
        if (!existing) {
            throw new Error(`Provenance not found for output ${outputId}`);
        }
        this.entries.set(outputId, { ...existing, feedback });
    }
    get(outputId) {
        return this.entries.get(outputId);
    }
    list() {
        return Array.from(this.entries.values());
    }
}
exports.ProvenanceTracker = ProvenanceTracker;
