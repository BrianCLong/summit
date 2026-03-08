"use strict";
// @ts-nocheck
// server/src/lib/resources/budget-tracker.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetTracker = exports.BudgetTracker = void 0;
const events_1 = require("events");
const types_js_1 = require("./types.js");
// In-memory stores
const costStore = {};
const budgetStore = {};
class BudgetTracker extends events_1.EventEmitter {
    static instance;
    constructor() {
        super();
    }
    static getInstance() {
        if (!BudgetTracker.instance) {
            BudgetTracker.instance = new BudgetTracker();
        }
        return BudgetTracker.instance;
    }
    /**
     * Defines a budget for a specific domain for a tenant.
     */
    setBudget(tenantId, config) {
        if (!budgetStore[tenantId]) {
            budgetStore[tenantId] = {};
        }
        const current = budgetStore[tenantId][config.domain];
        // Preserve current spending if updating budget
        const currentSpending = current ? current.currentSpending : 0;
        const periodStart = current ? current.periodStart : new Date(); // In real app, calculate based on period logic
        // Simple period end calculation (30 days for monthly, 1 day for daily)
        const periodEnd = new Date(periodStart);
        if (config.period === 'monthly') {
            periodEnd.setDate(periodEnd.getDate() + 30);
        }
        else {
            periodEnd.setDate(periodEnd.getDate() + 1);
        }
        budgetStore[tenantId][config.domain] = {
            ...config,
            currentSpending,
            forecastedSpending: 0, // Recalculate later
            periodStart,
            periodEnd,
            triggeredThresholds: current ? current.triggeredThresholds : [],
        };
        // Recalculate forecast immediately
        this.updateForecast(tenantId, config.domain);
    }
    /**
     * Checks if an operation is allowed within the budget.
     * Returns false if the budget would be exceeded (Hard Stop).
     */
    checkBudget(tenantId, domain, estimatedCost = 0) {
        const budget = budgetStore[tenantId]?.[domain];
        if (!budget) {
            return true; // No budget = unlimited (soft enforcement)
        }
        if (budget.currentSpending + estimatedCost > budget.limit) {
            this.emit('budget_exceeded', {
                tenantId,
                domain,
                limit: budget.limit,
                currentSpending: budget.currentSpending,
                attemptedCost: estimatedCost,
                timestamp: new Date(),
            });
            if (budget.hardStop) {
                return false; // HARD STOP
            }
        }
        return true;
    }
    /**
     * Tracks a realized cost.
     */
    trackCost(tenantId, domain, amount, details, attribution) {
        if (!costStore[tenantId]) {
            costStore[tenantId] = [];
        }
        const costRecord = {
            tenantId,
            domain,
            amount,
            timestamp: new Date(),
            details,
            attribution
        };
        costStore[tenantId].push(costRecord);
        // Update Budget Status
        const budget = budgetStore[tenantId]?.[domain];
        if (budget) {
            budget.currentSpending += amount;
            this.updateForecast(tenantId, domain);
            this.checkThresholds(tenantId, domain, budget);
        }
    }
    /**
     * Updates the spending forecast based on historical data.
     * Epic 3: Forecasting & Cost Signals
     */
    updateForecast(tenantId, domain) {
        const budget = budgetStore[tenantId]?.[domain];
        if (!budget)
            return;
        const costs = costStore[tenantId] || [];
        const domainCosts = costs.filter(c => c.domain === domain && c.timestamp >= budget.periodStart);
        if (domainCosts.length === 0) {
            budget.forecastedSpending = budget.currentSpending;
            return;
        }
        // Simple Linear Extrapolation
        const now = new Date();
        const startTime = budget.periodStart.getTime();
        const elapsedTime = now.getTime() - startTime;
        const totalPeriodTime = budget.periodEnd.getTime() - startTime;
        if (elapsedTime <= 0)
            return;
        const burnRate = budget.currentSpending / elapsedTime; // Cost per millisecond
        const projectedTotal = burnRate * totalPeriodTime;
        budget.forecastedSpending = projectedTotal;
    }
    /**
     * Checks alert thresholds and emits alerts.
     * Epic 4: Alerts
     */
    checkThresholds(tenantId, domain, budget) {
        const ratio = budget.currentSpending / budget.limit;
        // Check if we just crossed a threshold
        for (const threshold of budget.alertThresholds) {
            // Only alert if we haven't alerted for this threshold yet
            if (ratio >= threshold && !budget.triggeredThresholds.includes(threshold)) {
                this.emit('threshold_reached', {
                    tenantId,
                    domain,
                    threshold,
                    usage: ratio,
                    limit: budget.limit,
                    timestamp: new Date()
                });
                // Mark threshold as triggered
                budget.triggeredThresholds.push(threshold);
            }
        }
    }
    /**
     * Returns a report for a tenant.
     * Epic 4: Reports
     */
    getTenantReport(tenantId) {
        return budgetStore[tenantId] || {};
    }
    getDomainBudget(tenantId, domain) {
        return budgetStore[tenantId]?.[domain];
    }
    /**
     * Get detailed costs with attribution
     */
    getAttributedCosts(tenantId) {
        return costStore[tenantId] || [];
    }
    /**
     * Generates optimization suggestions based on usage patterns.
     * Epic 4: Optimization Loops
     */
    getOptimizationSuggestions(tenantId) {
        const suggestions = [];
        const report = this.getTenantReport(tenantId);
        // Check for high spending domains
        for (const [domainKey, budget] of Object.entries(report)) {
            const domain = domainKey;
            if (!budget)
                continue;
            const ratio = budget.currentSpending / budget.limit;
            if (ratio > 0.8) {
                suggestions.push(`High spend in ${domain} (${(ratio * 100).toFixed(1)}%). Consider reviewing usage or increasing budget.`);
            }
            if (domain === types_js_1.CostDomain.AGENT_RUNS && budget.currentSpending > 100) {
                suggestions.push(`Consider using smaller models for simpler Agent tasks to reduce ${domain} costs.`);
            }
        }
        if (suggestions.length === 0) {
            suggestions.push('No immediate optimizations found. Spending is within healthy limits.');
        }
        return suggestions;
    }
}
exports.BudgetTracker = BudgetTracker;
exports.budgetTracker = BudgetTracker.getInstance();
