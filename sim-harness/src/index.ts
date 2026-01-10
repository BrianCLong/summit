/**
 * IntelGraph Simulation Harness
 * Main entry point for the simulation and evaluation system
 */

// Generators
export { ScenarioGenerator } from './generators/ScenarioGenerator.js';

// Drivers
export { GhostAnalyst } from './drivers/GhostAnalyst.js';

// Metrics
export { MetricsCollector } from './metrics/MetricsCollector.js';
export { MissionSuiteRunner } from './metrics/MissionSuiteRunner.js';

// Reporters
export { ComparisonReporter } from './reporters/ComparisonReporter.js';

// Red-team harness
export { RedTeamHarness } from './redteam/RedTeamHarness.js';
export { RedTeamPlanLoader } from './redteam/RedTeamPlanLoader.js';
export { DEFAULT_DETECTION_RULES, DEFAULT_SCENARIOS } from './redteam/defaults.js';

// Utils
export { Logger } from './utils/Logger.js';
export { ConfigLoader } from './utils/ConfigLoader.js';

// Types
export * from './types/index.js';

// Version
export const VERSION = '1.0.0';
