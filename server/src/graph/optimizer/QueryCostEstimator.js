"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryCostEstimator = void 0;
class QueryCostEstimator {
    estimate(analysis) {
        let cost = 0;
        cost += analysis.nodeCount * 10;
        cost += analysis.relationshipCount * 20;
        cost += analysis.joinCount * 50;
        cost += analysis.aggregationCount * 30;
        if (analysis.hasWildcard)
            cost *= 1.5;
        let rows = 1;
        rows *= Math.pow(10, analysis.nodeCount);
        rows /= Math.pow(2, analysis.filterCount);
        if (analysis.aggregationCount > 0)
            rows = 1;
        return {
            cost,
            rows: Math.max(1, Math.floor(rows))
        };
    }
}
exports.QueryCostEstimator = QueryCostEstimator;
