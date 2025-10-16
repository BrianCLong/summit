export interface EvaluationContext {
  artifact: string;
  content: string;
}

export interface Evaluator {
  name: string;
  evaluate(ctx: EvaluationContext): number;
}

export const accuracyEvaluator: Evaluator = {
  name: 'accuracy',
  evaluate: (ctx) => (ctx.content.includes('PASS') ? 0.95 : 0.6),
};

export const complianceEvaluator: Evaluator = {
  name: 'compliance',
  evaluate: (ctx) => (/(pii|secret)/i.test(ctx.content) ? 0.1 : 0.9),
};

export const buildPerformanceEvaluator: Evaluator = {
  name: 'build-perf',
  evaluate: (ctx) => (ctx.content.includes('p95') ? 0.85 : 0.5),
};

export const readabilityEvaluator: Evaluator = {
  name: 'readability',
  evaluate: (ctx) => (ctx.content.split(/\s+/).length < 400 ? 0.9 : 0.6),
};

export function aggregateEvaluations(content: string): Record<string, number> {
  const ctx: EvaluationContext = { artifact: 'output', content };
  const scores = [
    accuracyEvaluator,
    complianceEvaluator,
    buildPerformanceEvaluator,
    readabilityEvaluator,
  ].map((evaluator) => [evaluator.name, evaluator.evaluate(ctx)]);
  return Object.fromEntries(scores);
}
