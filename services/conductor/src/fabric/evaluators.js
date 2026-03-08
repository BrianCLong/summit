"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readabilityEvaluator = exports.buildPerformanceEvaluator = exports.complianceEvaluator = exports.accuracyEvaluator = void 0;
exports.aggregateEvaluations = aggregateEvaluations;
exports.accuracyEvaluator = {
    name: 'accuracy',
    evaluate: (ctx) => (ctx.content.includes('PASS') ? 0.95 : 0.6),
};
exports.complianceEvaluator = {
    name: 'compliance',
    evaluate: (ctx) => (/(pii|secret)/i.test(ctx.content) ? 0.1 : 0.9),
};
exports.buildPerformanceEvaluator = {
    name: 'build-perf',
    evaluate: (ctx) => (ctx.content.includes('p95') ? 0.85 : 0.5),
};
exports.readabilityEvaluator = {
    name: 'readability',
    evaluate: (ctx) => (ctx.content.split(/\s+/).length < 400 ? 0.9 : 0.6),
};
function aggregateEvaluations(content) {
    const ctx = { artifact: 'output', content };
    const scores = [
        exports.accuracyEvaluator,
        exports.complianceEvaluator,
        exports.buildPerformanceEvaluator,
        exports.readabilityEvaluator,
    ].map((evaluator) => [evaluator.name, evaluator.evaluate(ctx)]);
    return Object.fromEntries(scores);
}
