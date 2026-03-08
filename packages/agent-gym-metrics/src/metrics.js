"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentMetrics = void 0;
class AgentMetrics {
    static calculateLoopingIndex(turns) {
        const actionStrings = turns.map(t => JSON.stringify(t.action));
        const uniqueActions = new Set(actionStrings);
        const repeats = turns.length - uniqueActions.size;
        const loopingIndex = turns.length > 0 ? repeats / turns.length : 0;
        return {
            name: 'LoopingIndex',
            value: loopingIndex,
            metadata: { totalTurns: turns.length, uniqueActions: uniqueActions.size }
        };
    }
    static calculateSuccessRate(episodes) {
        const successes = episodes.filter(e => e.success).length;
        return {
            name: 'SuccessRate',
            value: episodes.length > 0 ? successes / episodes.length : 0
        };
    }
    static calculateAverageSteps(episodes) {
        const totalSteps = episodes.reduce((sum, e) => sum + e.turns.length, 0);
        return {
            name: 'AverageSteps',
            value: episodes.length > 0 ? totalSteps / episodes.length : 0
        };
    }
}
exports.AgentMetrics = AgentMetrics;
