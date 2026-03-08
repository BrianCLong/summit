"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationEngine = void 0;
const types_js_1 = require("./types.js");
class ReconciliationEngine {
    pairs = new Map();
    runs = [];
    registerPair(pair) {
        this.pairs.set(pair.id, pair);
    }
    listPairs() {
        return Array.from(this.pairs.values());
    }
    listRuns() {
        return [...this.runs];
    }
    async runPair(pairId) {
        const pair = this.pairs.get(pairId);
        if (!pair)
            throw new Error(`Unknown drift pair ${pairId}`);
        const startedAt = new Date();
        const source = await pair.loadSource();
        const target = await pair.loadTarget();
        const drift = pair.diff(source, target);
        const autoFixes = [];
        if (drift.length > 0 && pair.autoFix && pair.riskTier !== 'high') {
            const fixes = await pair.autoFix(drift);
            autoFixes.push(...fixes);
        }
        const run = {
            id: (0, types_js_1.newIdentifier)(),
            pairId,
            startedAt,
            completedAt: new Date(),
            driftDetected: drift,
            autoFixesApplied: autoFixes,
            requiresReview: drift.length > autoFixes.length,
        };
        this.runs.push(run);
        return run;
    }
    metrics() {
        const totalRuns = this.runs.length;
        const totalDrift = this.runs.reduce((sum, run) => sum + run.driftDetected.length, 0);
        const totalAutoFixes = this.runs.reduce((sum, run) => sum + run.autoFixesApplied.length, 0);
        const avgDrift = totalRuns === 0 ? 0 : totalDrift / totalRuns;
        const recurrence = this.runs.filter((run) => run.driftDetected.length > 0).length;
        return {
            totalRuns,
            avgDrift,
            totalAutoFixes,
            recurrence,
        };
    }
}
exports.ReconciliationEngine = ReconciliationEngine;
