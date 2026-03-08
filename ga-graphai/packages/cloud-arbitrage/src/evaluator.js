"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeadToHeadEvaluator = void 0;
const agent_js_1 = require("./agent.js");
class HeadToHeadEvaluator {
    agent;
    constructor(agent = new agent_js_1.ArbitrageAgent()) {
        this.agent = agent;
    }
    run(snapshot, baselines) {
        const results = baselines.map((baseline) => this.evaluateOne(snapshot, baseline));
        const aggregateNetBenefit = results.reduce((sum, result) => sum + result.netBenefit, 0);
        return {
            generatedAt: new Date().toISOString(),
            results,
            aggregateNetBenefit,
        };
    }
    evaluateOne(snapshot, baseline) {
        const agentSummaries = this.agent.recommendPortfolio(snapshot, baseline.workload, {
            topN: 1,
            minScore: 0.5,
        });
        const agentSummary = agentSummaries[0];
        const agentSavings = agentSummary?.estimatedSavings ?? 0;
        const netBenefit = agentSavings - baseline.baselineSavings;
        return {
            baselineTool: baseline.tool,
            workloadId: baseline.workload.id,
            agentSummary,
            baselineSavings: baseline.baselineSavings,
            agentSavings,
            netBenefit,
        };
    }
}
exports.HeadToHeadEvaluator = HeadToHeadEvaluator;
