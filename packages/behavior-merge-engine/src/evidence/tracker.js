"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceTracker = void 0;
class EvidenceTracker {
    overlapCounts = {};
    uniqueCount = 0;
    sharedCount = 0;
    totalParams = 0;
    // Records a metric for a specific parameter/key (e.g. average overlap)
    recordParamMetric(paramId, value) {
        this.overlapCounts[paramId] = value;
    }
    // Updates global statistics
    addGlobalStats(unique, shared, total) {
        this.uniqueCount += unique;
        this.sharedCount += shared;
        this.totalParams += total;
    }
    getStats() {
        return {
            overlapCounts: this.overlapCounts,
            uniqueRatio: this.totalParams > 0 ? this.uniqueCount / this.totalParams : 0,
            sharedRatio: this.totalParams > 0 ? this.sharedCount / this.totalParams : 0,
            totalParams: this.totalParams
        };
    }
}
exports.EvidenceTracker = EvidenceTracker;
