"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaPromptPlanner = void 0;
const DEFAULT_LEARNING_RATE = 0.2;
class MetaPromptPlanner {
    modules;
    tokenBudget;
    learningRate;
    state = new Map();
    constructor(options) {
        this.modules = options.modules;
        this.tokenBudget = options.tokenBudget;
        this.learningRate = options.learningRate ?? DEFAULT_LEARNING_RATE;
        for (const module of this.modules) {
            this.state.set(module.name, { weight: 1, successes: 0, invocations: 0 });
        }
    }
    plan(context) {
        const candidates = this.modules.filter(module => {
            if (module.minComplexity !== undefined && context.complexity < module.minComplexity) {
                return false;
            }
            if (module.maxComplexity !== undefined && context.complexity > module.maxComplexity) {
                return false;
            }
            return true;
        });
        candidates.sort((a, b) => this.getModuleScore(b.name) - this.getModuleScore(a.name));
        const selected = [];
        let estimatedTokens = 0;
        for (const module of candidates) {
            if (estimatedTokens + module.estimatedTokens > this.tokenBudget) {
                continue;
            }
            selected.push(module);
            estimatedTokens += module.estimatedTokens;
        }
        const prompt = selected.map(module => module.template(context)).join('\n\n');
        return { modules: selected.map(module => module.name), prompt, estimatedTokens };
    }
    recordFeedback(feedback) {
        const state = this.state.get(feedback.module);
        if (!state) {
            return;
        }
        state.invocations += 1;
        state.successes += feedback.score;
        const successRate = state.successes / state.invocations;
        const adjustment = this.learningRate * (successRate - state.weight);
        state.weight = Math.max(0.1, state.weight + adjustment - feedback.tokenCost / 1000);
        this.state.set(feedback.module, state);
    }
    getModuleScore(name) {
        const state = this.state.get(name);
        return state ? state.weight : 0;
    }
}
exports.MetaPromptPlanner = MetaPromptPlanner;
