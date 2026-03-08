"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalRegistry = exports.UncertaintyRegistry = void 0;
const node_crypto_1 = require("node:crypto");
class UncertaintyRegistry {
    records = new Map();
    createRecord(entityRef, initialMetrics, meta) {
        const id = (0, node_crypto_1.randomUUID)();
        const now = new Date().toISOString();
        const scores = {
            epistemic_score: 0.0,
            aleatoric_score: 0.0,
            disagreement_index: 0.0,
            evidence_coverage: 1.0,
            ...initialMetrics,
        };
        const metadata = {
            category: null,
            created_at: now,
            updated_at: now,
            source_agent: null,
            human_overrides: false,
            ...meta,
        };
        const record = {
            id,
            appliesTo: entityRef,
            state: 'Detected',
            scores,
            meta: metadata,
        };
        this.records.set(id, record);
        return record;
    }
    updateRecord(id, metricsPatch, newState) {
        const record = this.records.get(id);
        if (!record) {
            return null;
        }
        if (metricsPatch) {
            record.scores = { ...record.scores, ...metricsPatch };
        }
        if (newState) {
            record.state = newState;
        }
        record.meta.updated_at = new Date().toISOString();
        this.records.set(id, record);
        return record;
    }
    findByEntity(entityRef) {
        return Array.from(this.records.values()).filter((r) => r.appliesTo === entityRef);
    }
    getAll() {
        return Array.from(this.records.values());
    }
}
exports.UncertaintyRegistry = UncertaintyRegistry;
exports.globalRegistry = new UncertaintyRegistry();
