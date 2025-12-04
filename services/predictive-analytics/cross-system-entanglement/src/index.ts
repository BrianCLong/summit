/**
 * Cross-System Entanglement Detector Service
 * Entry point - Discovers hidden relationships across domains
 */

export { EntanglementDetector } from './EntanglementDetector.js';

// Models
export * from './models/EntanglementSignature.js';
export * from './models/SystemCoupling.js';
export * from './models/SynchronizationEvent.js';
export * from './models/RiskScore.js';

// Algorithms
export * from './algorithms/LatentCouplingFinder.js';
export * from './algorithms/SynchronizationDetector.js';
export * from './algorithms/RiskScorer.js';
export * from './algorithms/CrossDomainCorrelator.js';

// Resolvers
export { entanglementResolvers } from './resolvers/entanglementResolvers.js';
