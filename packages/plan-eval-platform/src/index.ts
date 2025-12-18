/**
 * Plan Eval Platform
 *
 * Evaluation-first platform for Summit/IntelGraph with cost-aware routing and telemetry.
 *
 * @packageDocumentation
 */

// Types
export * from './types.js';

// Runtime
export {
  TraceBuilder,
  parseTrace,
  mergeTraces,
} from './runtime/trace-schema.js';

export {
  TelemetryClient,
  createTelemetryClient,
} from './runtime/telemetry-client.js';

export {
  CostModel,
  createCostModel,
  DEFAULT_COST_CONFIG,
} from './runtime/cost-model.js';

// Eval
export {
  ScenarioLoader,
  createScenarioLoader,
} from './eval/scenario-loader.js';

export {
  EvalRunner,
  createEvalRunner,
  type EvalRunnerConfig,
} from './eval/runner.js';

export {
  MetricsCollector,
  calculateMetricsFromTraces,
} from './eval/metrics.js';

// Routing
export {
  BaseRouter,
  createCandidatesFromScenario,
} from './routing/base-router.js';

export {
  RandomRouter,
  createRandomRouter,
} from './routing/random-router.js';

export {
  GreedyCostRouter,
  createGreedyCostRouter,
} from './routing/greedy-cost-router.js';

export {
  AdaptiveRouter,
  createAdaptiveRouter,
} from './routing/adaptive-router.js';

export { createRouter } from './routing/index.js';

// Safety
export {
  SafetyChecker,
  createSafetyChecker,
} from './safety/checker.js';

export {
  RedTeamRunner,
  createRedTeamRunner,
  type RedTeamScenario,
} from './safety/red-team.js';
