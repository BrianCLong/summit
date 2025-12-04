/**
 * Emergent Pattern Genesis Service
 * Entry point - Predicts patterns that don't exist yet
 */

export { PatternGenesisEngine, createPatternGenesisEngine } from './PatternGenesisEngine.js';
export type { GenesisConfig, GenesisResult } from './PatternGenesisEngine.js';

// Models
export * from './models/ProtoPattern.js';
export * from './models/FutureMotif.js';
export * from './models/PatternCompetition.js';
export * from './models/DominanceScore.js';

// Algorithms
export * from './algorithms/ProtoPatternDetector.js';
export * from './algorithms/PatternEvolver.js';
export * from './algorithms/CompetitionSimulator.js';
export * from './algorithms/DominancePredictor.js';

// Resolvers
export { patternGenesisResolvers } from './resolvers/patternGenesisResolvers.js';
