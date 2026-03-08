"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpendGate = void 0;
const DEFAULT_THRESHOLDS = {
    manager: 10000,
    director: 25000,
    vp: 50000,
    cfo: 100000,
};
class SpendGate {
    thresholds;
    constructor(thresholds = DEFAULT_THRESHOLDS) {
        this.thresholds = thresholds;
    }
    evaluate(intake, riskTier) {
        const approvers = ['manager'];
        if (intake.spendEstimate >= this.thresholds.manager) {
            approvers.push('director');
        }
        if (intake.spendEstimate >= this.thresholds.director) {
            approvers.push('vp');
        }
        if (intake.spendEstimate >= this.thresholds.vp) {
            approvers.push('cfo');
        }
        const requiresExecutiveSignoff = riskTier === 0 || intake.spendEstimate >= this.thresholds.cfo;
        return {
            spendGate: approvers,
            requiresExecutiveSignoff,
            requiresSecurity: riskTier <= 2,
            requiresLegal: true,
            requiresFinance: true,
            requiresIT: true,
        };
    }
}
exports.SpendGate = SpendGate;
