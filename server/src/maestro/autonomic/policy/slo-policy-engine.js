"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLOPolicyEngine = void 0;
const types_js_1 = require("./types.js");
const crypto_1 = require("crypto");
class SLOPolicyEngine {
    contracts = new Map();
    budgets = new Map();
    signalsService;
    constructor(signalsService) {
        this.signalsService = signalsService;
    }
    registerContract(contract) {
        this.contracts.set(contract.tenantId, contract);
        // Initialize budgets
        contract.slos.forEach(slo => {
            this.budgets.set(slo.id, {
                sloId: slo.id,
                remainingPoints: slo.errorBudgetStartingPoints,
                totalPoints: slo.errorBudgetStartingPoints,
                status: 'HEALTHY'
            });
        });
    }
    evaluate(tenantId) {
        const contract = this.contracts.get(tenantId);
        if (!contract)
            return [];
        const alerts = [];
        const health = this.signalsService.generateHealthSnapshot(tenantId);
        for (const slo of contract.slos) {
            // Find relevant metrics in health snapshot
            // This is a simplification. In reality we'd query SignalService for the specific window.
            // We will re-query signals for exact window logic.
            const series = this.signalsService.aggregateSignals(slo.targetType, this.getSourceIdForSlo(slo, health), slo.window);
            if (series.datapoints.length === 0)
                continue;
            // Calculate current value (e.g., avg latency, or success rate)
            const currentValue = this.calculateMetricValue(series.datapoints, slo.targetType);
            const violation = this.checkViolation(currentValue, slo);
            if (violation) {
                const budget = this.budgets.get(slo.id);
                if (budget) {
                    budget.remainingPoints -= slo.burnRatePerViolation;
                    budget.lastBurnTimestamp = new Date();
                    if (budget.remainingPoints <= 0) {
                        budget.status = 'EXHAUSTED';
                        alerts.push(this.createAlert(slo, types_js_1.SLOAlertLevel.BUDGET_EXHAUSTED, `Error budget exhausted. Value: ${currentValue}`));
                    }
                    else if (budget.remainingPoints < budget.totalPoints * 0.2) {
                        budget.status = 'WARNING';
                        alerts.push(this.createAlert(slo, types_js_1.SLOAlertLevel.WARNING, `Error budget low. Remaining: ${budget.remainingPoints}`));
                    }
                    else {
                        // Just a breach but budget handles it
                        alerts.push(this.createAlert(slo, types_js_1.SLOAlertLevel.BREACH, `SLO Breach. Value: ${currentValue} ${slo.comparator} ${slo.targetValue}`));
                    }
                }
            }
        }
        return alerts;
    }
    getSourceIdForSlo(slo, health) {
        // Naive mapping for demo.
        // Ideally SLO definition says "target: system" or "target: agent-x"
        return 'system-core'; // Defaulting to system level for this slice
    }
    calculateMetricValue(datapoints, type) {
        if (datapoints.length === 0)
            return 0;
        const sum = datapoints.reduce((a, b) => a + b.value, 0);
        return sum / datapoints.length;
    }
    checkViolation(value, slo) {
        switch (slo.comparator) {
            case '<': return !(value < slo.targetValue);
            case '>': return !(value > slo.targetValue);
            case '<=': return !(value <= slo.targetValue);
            case '>=': return !(value >= slo.targetValue);
            default: return false;
        }
    }
    createAlert(slo, level, message) {
        return {
            id: (0, crypto_1.randomUUID)(),
            sloId: slo.id,
            level,
            message,
            timestamp: new Date(),
            metadata: { target: slo.targetValue }
        };
    }
    getBudgetStatus(sloId) {
        return this.budgets.get(sloId);
    }
}
exports.SLOPolicyEngine = SLOPolicyEngine;
