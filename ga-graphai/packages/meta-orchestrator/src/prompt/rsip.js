"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecursiveSelfImprovementEngine = void 0;
const utils_js_1 = require("./utils.js");
const DEFAULT_WEIGHTS = {
    relevance: 0.3,
    clarity: 0.2,
    completeness: 0.25,
    factuality: 0.2,
    safety: 0.05
};
const DEFAULT_MAX_ITERATIONS = 5;
const DEFAULT_THRESHOLD = 0.9;
const DEFAULT_FOCUS_WINDOW = 3;
function normalizeWeights(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((acc, [, value]) => acc + value, 0);
    if (total === 0) {
        const fallbackWeight = entries.length > 0 ? 1 / entries.length : 0;
        const normalized = {};
        for (const [aspect] of entries) {
            normalized[aspect] = fallbackWeight;
        }
        return normalized;
    }
    const normalized = {};
    for (const [aspect, value] of entries) {
        normalized[aspect] = value / total;
    }
    return normalized;
}
class RecursiveSelfImprovementEngine {
    aspects;
    generator;
    evaluator;
    refinePrompt;
    maxIterations;
    qualityThreshold;
    focusWindow;
    weights;
    logger;
    constructor(options) {
        if (options.aspects.length === 0) {
            throw new Error('RSIP requires at least one quality aspect.');
        }
        this.aspects = [...options.aspects];
        this.generator = options.generator;
        this.evaluator = options.evaluator;
        this.refinePrompt = options.refinePrompt;
        this.maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
        this.qualityThreshold = options.qualityThreshold ?? DEFAULT_THRESHOLD;
        this.focusWindow = options.focusWindow ?? DEFAULT_FOCUS_WINDOW;
        const merged = { ...DEFAULT_WEIGHTS };
        for (const aspect of this.aspects) {
            merged[aspect] = options.aspectWeights?.[aspect] ?? merged[aspect] ?? 1;
        }
        this.weights = normalizeWeights(merged);
        this.logger = options.logger;
    }
    async run(initialPrompt) {
        let currentPrompt = initialPrompt;
        const logs = [];
        for (let iteration = 1; iteration <= this.maxIterations; iteration += 1) {
            const output = await this.generator(currentPrompt, iteration, logs);
            const aspectScores = {};
            for (const aspect of this.aspects) {
                const score = await this.evaluator(output, aspect, iteration, logs);
                aspectScores[aspect] = (0, utils_js_1.clampValue)(score, 0, 1);
            }
            const prioritizedAspects = this.prioritizeAspects(logs, aspectScores);
            const aggregateScore = this.aggregateScore(aspectScores);
            const entry = {
                iteration,
                prompt: currentPrompt,
                output,
                aspectScores,
                prioritizedAspects,
                aggregateScore
            };
            logs.push(entry);
            if (this.logger) {
                this.logger(entry);
            }
            if (aggregateScore >= this.qualityThreshold) {
                return { success: true, finalOutput: output, iterations: iteration, logs };
            }
            currentPrompt = this.buildRefinementPrompt(currentPrompt, output, prioritizedAspects, iteration, logs);
        }
        const last = logs.at(-1);
        return { success: false, finalOutput: last?.output ?? '', iterations: logs.length, logs };
    }
    prioritizeAspects(history, latest) {
        const window = history.slice(Math.max(0, history.length - (this.focusWindow - 1)));
        const blended = new Map();
        for (const aspect of this.aspects) {
            const pastValues = window.map(entry => entry.aspectScores[aspect]).filter(value => typeof value === 'number');
            const historicalAverage = pastValues.length === 0 ? 1 : pastValues.reduce((acc, value) => acc + value, 0) / pastValues.length;
            blended.set(aspect, (historicalAverage + latest[aspect]) / 2);
        }
        return [...blended.entries()].sort(([, a], [, b]) => a - b).map(([aspect]) => aspect);
    }
    aggregateScore(aspectScores) {
        let total = 0;
        for (const aspect of this.aspects) {
            total += (aspectScores[aspect] ?? 0) * (this.weights[aspect] ?? 0);
        }
        return total;
    }
    buildRefinementPrompt(previousPrompt, output, prioritizedAspects, iteration, history) {
        if (this.refinePrompt) {
            return this.refinePrompt(previousPrompt, output, prioritizedAspects, iteration, history);
        }
        const focus = prioritizedAspects.slice(0, 2).join(' and ') || 'overall quality';
        return [
            'You are refining a draft response. Improve it with focus on the weakest aspects.',
            `Priority aspects: ${focus}.`,
            'Original prompt:',
            previousPrompt,
            'Current draft:',
            output,
            'Return an improved version that addresses the priority aspects while keeping strengths intact.'
        ].join('\n\n');
    }
}
exports.RecursiveSelfImprovementEngine = RecursiveSelfImprovementEngine;
