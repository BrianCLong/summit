"use strict";
/**
 * Cloud Cost Management
 * Track and optimize cloud spending across providers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudCostManager = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'cost-manager' });
class CloudCostManager {
    budgets;
    historicalCosts;
    constructor() {
        this.budgets = new Map();
        this.historicalCosts = [];
    }
    setBudget(budget) {
        this.budgets.set(budget.provider, budget);
        logger.info({ provider: budget.provider, limit: budget.monthlyLimit }, 'Budget set');
    }
    addCostMetrics(metrics) {
        this.historicalCosts.push(metrics);
        // Check for budget alerts
        this.checkBudgetAlerts(metrics);
    }
    checkBudgetAlerts(metrics) {
        const budget = this.budgets.get(metrics.provider);
        if (!budget)
            return;
        const currentMonth = new Date().getMonth();
        const monthlyTotal = this.getMonthlyTotal(metrics.provider, currentMonth);
        for (const threshold of budget.alertThresholds) {
            const thresholdAmount = budget.monthlyLimit * threshold;
            if (monthlyTotal >= thresholdAmount && monthlyTotal < thresholdAmount * 1.1) {
                logger.warn({
                    provider: metrics.provider,
                    current: monthlyTotal,
                    threshold: thresholdAmount,
                    limit: budget.monthlyLimit
                }, 'Budget threshold reached');
            }
        }
    }
    getMonthlyTotal(provider, month) {
        return this.historicalCosts
            .filter(m => m.provider === provider && m.billingPeriod.start.getMonth() === month)
            .reduce((sum, m) => sum + m.costUSD, 0);
    }
    getCostTrends(provider, days = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        return this.historicalCosts
            .filter(m => m.provider === provider && m.billingPeriod.start >= cutoffDate)
            .sort((a, b) => a.billingPeriod.start.getTime() - b.billingPeriod.start.getTime());
    }
    detectAnomalies(provider) {
        const alerts = [];
        const recentCosts = this.getCostTrends(provider, 7);
        if (recentCosts.length < 2)
            return alerts;
        // Calculate average and detect spikes
        const average = recentCosts.reduce((sum, m) => sum + m.costUSD, 0) / recentCosts.length;
        const latest = recentCosts[recentCosts.length - 1];
        if (latest.costUSD > average * 1.5) {
            alerts.push({
                id: `anomaly-${provider}-${Date.now()}`,
                provider,
                type: 'anomaly',
                severity: 'high',
                message: `Cost spike detected: ${latest.costUSD.toFixed(2)} vs average ${average.toFixed(2)}`,
                currentCost: latest.costUSD,
                threshold: average * 1.5,
                timestamp: new Date()
            });
        }
        return alerts;
    }
    forecastNextMonth(provider) {
        const trends = this.getCostTrends(provider, 90);
        if (trends.length === 0)
            return 0;
        // Simple linear forecast based on recent trend
        const recentAverage = trends.slice(-30).reduce((sum, m) => sum + m.costUSD, 0) / 30;
        return recentAverage * 30;
    }
    getOptimizationSuggestions(provider) {
        const suggestions = [];
        const trends = this.getCostTrends(provider, 30);
        if (trends.length === 0)
            return suggestions;
        // Analyze cost breakdown
        const avgBreakdown = {
            compute: trends.reduce((sum, m) => sum + m.breakdown.compute, 0) / trends.length,
            storage: trends.reduce((sum, m) => sum + m.breakdown.storage, 0) / trends.length,
            network: trends.reduce((sum, m) => sum + m.breakdown.network, 0) / trends.length,
            other: trends.reduce((sum, m) => sum + m.breakdown.other, 0) / trends.length
        };
        if (avgBreakdown.compute > 50) {
            suggestions.push('High compute costs: Consider reserved instances or spot instances');
        }
        if (avgBreakdown.storage > 30) {
            suggestions.push('High storage costs: Implement data lifecycle policies and compression');
        }
        if (avgBreakdown.network > 20) {
            suggestions.push('High network costs: Optimize data transfer and use CDN where appropriate');
        }
        return suggestions;
    }
    getCostByRegion(provider) {
        const costsByRegion = new Map();
        this.historicalCosts
            .filter(m => m.provider === provider)
            .forEach(metrics => {
            const current = costsByRegion.get(metrics.region) || 0;
            costsByRegion.set(metrics.region, current + metrics.costUSD);
        });
        return costsByRegion;
    }
}
exports.CloudCostManager = CloudCostManager;
