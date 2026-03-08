"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UncertaintyEvolutionWorker = void 0;
const registry_js_1 = require("./registry.js");
class UncertaintyEvolutionWorker {
    registry;
    checkIntervalMs;
    expirationMs;
    intervalId = null;
    constructor(registry = registry_js_1.globalRegistry, checkIntervalMs = 60000, expirationMs = 7 * 24 * 60 * 60 * 1000) {
        this.registry = registry;
        this.checkIntervalMs = checkIntervalMs;
        this.expirationMs = expirationMs;
    }
    start() {
        if (!this.intervalId) {
            this.intervalId = setInterval(() => this.evolveAll(), this.checkIntervalMs);
            console.log('UncertaintyEvolution worker started.');
        }
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('UncertaintyEvolution worker stopped.');
        }
    }
    evolveAll() {
        const records = this.registry.getAll();
        const now = new Date().getTime();
        for (const record of records) {
            const updatedAt = new Date(record.meta.updated_at).getTime();
            // Check for expiration
            if (now - updatedAt > this.expirationMs) {
                this.registry.updateRecord(record.id, undefined, 'Expired');
                continue;
            }
            // Apply state transition rules
            this.applyRules(record);
        }
    }
    applyRules(record) {
        const state = record.state;
        const scores = record.scores;
        // Detected -> Characterized happens in sensors usually
        // Characterized -> Mitigated
        if (state === 'Characterized') {
            if (scores.epistemic_score < 0.4 &&
                scores.disagreement_index < 0.2 &&
                scores.evidence_coverage > 0.6) {
                this.registry.updateRecord(record.id, undefined, 'Mitigated');
            }
        }
        // Mitigated -> Resolved
        else if (state === 'Mitigated') {
            if (scores.epistemic_score < 0.2 &&
                scores.aleatoric_score < 0.2 &&
                scores.disagreement_index < 0.1 &&
                scores.evidence_coverage > 0.8) {
                this.registry.updateRecord(record.id, undefined, 'Resolved');
            }
        }
        // Any -> Escalated
        if (state !== 'Escalated' && state !== 'Resolved' && state !== 'Expired') {
            if (scores.epistemic_score > 0.8 ||
                scores.disagreement_index > 0.6 ||
                scores.evidence_coverage < 0.2) {
                if (state === 'Characterized' || state === 'Mitigated') {
                    this.registry.updateRecord(record.id, undefined, 'Escalated');
                }
            }
        }
    }
}
exports.UncertaintyEvolutionWorker = UncertaintyEvolutionWorker;
