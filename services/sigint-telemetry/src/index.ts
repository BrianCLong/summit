/**
 * SIGINT Telemetry System
 *
 * Defensive SIGINT/CYBINT telemetry simulation stack for blue team analytics.
 *
 * IMPORTANT: This is a SIMULATION-ONLY system.
 * - All data is synthetic and fabricated
 * - No real-world targeting or sensitive data collection
 * - For defensive testing and security research only
 *
 * @packageDocumentation
 */

// Schemas
export * from './schemas/index.js';

// Generators
export * from './generators/index.js';

// Detection Engine
export * from './detections/index.js';

// Simulation
export * from './simulation/index.js';

// Version
export const VERSION = '1.0.0';

// Quick start helpers
export { createDetectionEngine } from './detections/engine.js';
export { createAnomalyDetector } from './detections/anomaly.js';
export { allRules } from './detections/rules/index.js';
export { runSimulation } from './simulation/runner.js';
export { createSampleInfrastructure } from './simulation/graph.js';
export { securityControls } from './simulation/controls.js';
