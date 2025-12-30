/**
 * Counterintelligence Platform
 *
 * Comprehensive suite of services for detecting, analyzing, and responding to
 * insider threats, foreign intelligence activities, and deception operations.
 */

export * from './ThreatActorModelingService.js';
export * from './DeceptionDetectionEngine.js';
export * from './AnomalyCorrelationService.js';

// Re-export singleton instances
export { threatActorModelingService } from './ThreatActorModelingService.js';
export { deceptionDetectionEngine } from './DeceptionDetectionEngine.js';
export { anomalyCorrelationService } from './AnomalyCorrelationService.js';
