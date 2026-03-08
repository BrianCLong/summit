"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArbitrageAgent = void 0;
const strategies_js_1 = require("./strategies.js");
class ArbitrageAgent {
    strategies;
    constructor(strategies = strategies_js_1.STRATEGIES) {
        this.strategies = strategies;
    }
    evaluate(snapshot, profile) {
        return this.strategies.flatMap((strategy) => strategy.evaluate({ snapshot, workloadProfile: profile }));
    }
    recommendPortfolio(snapshot, profile, options = {}) {
        const recommendations = this.evaluate(snapshot, profile);
        const minScore = options.minScore ?? 0.6;
        const filtered = recommendations.filter((rec) => rec.totalScore >= minScore);
        const ranked = [...filtered].sort((a, b) => {
            const priceDelta = a.expectedUnitPrice - b.expectedUnitPrice;
            if (Math.abs(priceDelta) > 0.001) {
                return priceDelta;
            }
            return b.totalScore - a.totalScore;
        });
        const top = options.topN ? ranked.slice(0, options.topN) : ranked;
        return top.map((recommendation) => ({
            strategy: recommendation.strategy,
            provider: recommendation.provider,
            region: recommendation.region,
            blendedUnitPrice: recommendation.expectedUnitPrice,
            estimatedSavings: this.estimateSavings(recommendation),
            confidence: Math.min(0.95, recommendation.totalScore / 3),
        }));
    }
    estimateSavings(recommendation) {
        const baseline = recommendation.expectedUnitPrice * 1.15;
        return baseline - recommendation.expectedUnitPrice;
    }
}
exports.ArbitrageAgent = ArbitrageAgent;
