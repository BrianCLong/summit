/**
 * Summit MDM Core Package
 * Enterprise Master Data Management infrastructure
 */

// Export types
export * from './types/index.js';

// Export engines
export { MDMEngine } from './engine/mdm-engine.js';
export { MatchingEngine } from './matching/matching-engine.js';
export { QualityEngine } from './quality/quality-engine.js';
