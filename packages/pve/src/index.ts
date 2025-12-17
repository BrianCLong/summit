/**
 * Summit Policy Validation Engine (PVE)
 *
 * OPA-driven governance and invariant enforcement for Summit.
 *
 * @module @summit/pve
 */

// Core exports
export * from './types/index.js';
export * from './evaluator/index.js';
export * from './github/index.js';
export * from './utils/index.js';

// Convenience re-exports
export {
  PolicyEngine,
  createPolicyEngine,
  PolicyViolationError,
  type PolicyEngineConfig,
  type EvaluationOptions,
  type EvaluationReport,
  type CustomValidator,
} from './evaluator/PolicyEngine.js';

export {
  PolicyResultBuilder,
  pass,
  fail,
  warn,
  info,
  aggregateResults,
  formatResults,
} from './evaluator/PolicyResult.js';

export {
  OPAAdapter,
  createOPAAdapter,
  type OPAConfig,
  type OPAEvalResult,
} from './evaluator/OPAAdapter.js';

export {
  PRValidator,
  createPRValidator,
  type PRValidatorConfig,
  type PRValidationResult,
} from './github/pull-request-validator.js';

export {
  parseDiff,
  toPRFile,
  getChangedLines,
  type ParsedDiff,
  type ParsedFile,
  type DiffHunk,
} from './github/diff-parser.js';

// Version
export const VERSION = '0.1.0';

/**
 * Quick validation helper
 */
export async function validate(
  input: import('./types/index.js').EvaluationContext,
  options?: import('./evaluator/PolicyEngine.js').EvaluationOptions,
): Promise<import('./evaluator/PolicyEngine.js').EvaluationReport> {
  const engine = createPolicyEngine();
  return engine.evaluate(input, options);
}

/**
 * Quick assertion helper - throws if validation fails
 */
export async function assertValid(
  input: import('./types/index.js').EvaluationContext,
  options?: import('./evaluator/PolicyEngine.js').EvaluationOptions,
): Promise<void> {
  const engine = createPolicyEngine();
  return engine.assertAll(input, options);
}
