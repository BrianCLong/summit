"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorInjector = exports.createErrorScenarioRunner = exports.CommonErrorScenarios = exports.ErrorInjector = exports.ErrorScenarioRunner = void 0;
var ErrorScenarioFramework_1 = require("./ErrorScenarioFramework");
Object.defineProperty(exports, "ErrorScenarioRunner", { enumerable: true, get: function () { return ErrorScenarioFramework_1.ErrorScenarioRunner; } });
Object.defineProperty(exports, "ErrorInjector", { enumerable: true, get: function () { return ErrorScenarioFramework_1.ErrorInjector; } });
Object.defineProperty(exports, "CommonErrorScenarios", { enumerable: true, get: function () { return ErrorScenarioFramework_1.CommonErrorScenarios; } });
Object.defineProperty(exports, "createErrorScenarioRunner", { enumerable: true, get: function () { return ErrorScenarioFramework_1.createErrorScenarioRunner; } });
Object.defineProperty(exports, "createErrorInjector", { enumerable: true, get: function () { return ErrorScenarioFramework_1.createErrorInjector; } });
