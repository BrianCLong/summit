/**
 * Error Scenario Testing Module
 *
 * Comprehensive framework for testing error handling and failure scenarios.
 *
 * @module tests/error-scenarios
 *
 * @example
 * ```typescript
 * import {
 *   ErrorScenarioRunner,
 *   ErrorInjector,
 *   CommonErrorScenarios,
 *   createErrorScenarioRunner,
 * } from '@tests/error-scenarios';
 *
 * const runner = createErrorScenarioRunner();
 *
 * // Register predefined scenarios
 * runner.registerScenario(
 *   CommonErrorScenarios.databaseConnectionFailure(
 *     async () => dbClient.query('SELECT 1'),
 *     async (result) => result instanceof Error
 *   )
 * );
 *
 * // Run scenarios
 * const results = await runner.runAll();
 * const summary = runner.getSummary();
 * ```
 */

export {
  ErrorScenarioRunner,
  ErrorInjector,
  CommonErrorScenarios,
  createErrorScenarioRunner,
  createErrorInjector,
  type ErrorScenarioType,
  type ErrorScenario,
  type ErrorScenarioResult,
  type ErrorInjectionConfig,
} from './ErrorScenarioFramework';
