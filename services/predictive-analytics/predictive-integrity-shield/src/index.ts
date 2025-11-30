/**
 * Predictive Integrity Shield Service
 * Entry point - Detects prediction reliability issues
 */

export { IntegrityShield, createIntegrityShield } from './IntegrityShield.js';
export type { ShieldConfig, PredictionInput, ShieldStatus } from './IntegrityShield.js';

// Models
export * from './models/IntegrityReport.js';
export * from './models/DriftMetric.js';
export * from './models/AdversarialSignal.js';

// Algorithms
export * from './algorithms/DriftDetector.js';
export * from './algorithms/BiasAnalyzer.js';
export * from './algorithms/AdversarialDetector.js';
export * from './algorithms/SelfHealer.js';

// Resolvers
export { integrityResolvers } from './resolvers/integrityResolvers.js';
