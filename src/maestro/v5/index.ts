// Maestro Conductor v0.5 - "Evaluate, Trust, and Ship" — Autonomous Release Train to Production
// Sprint Goal: Graduate from fast/cheap PRs to evaluation‑gated progressive delivery
// with measurable trust: every agent change is scored by an eval harness and shipped
// via canary/rollout when scores clear thresholds.

export { MaestroConductorV5 } from './conductor';
export { EvaluationHarness } from './evaluation/harness';
export { ProgressiveDelivery } from './cd/progressive-delivery';
export { SpecSynthAgent } from './agents/spec-synth';
export { RefactorSurgeonAgent } from './agents/refactor-surgeon';
export { ResolverAgent } from './agents/resolver';
export { MutationTesting } from './testing/mutation';
export { PropertyBasedTesting } from './testing/property-based';
export { CodeGraph } from './graph/code-graph';
export { PolicyReasoner } from './policy/reasoner';
export { CostOptimizer } from './optimization/cost-optimizer';

// Version info
export const VERSION = '0.5.0';
export const CODENAME = 'Evaluate, Trust, and Ship';
