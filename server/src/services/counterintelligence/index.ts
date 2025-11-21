/**
 * Counterintelligence Platform
 *
 * Comprehensive suite of services for detecting, analyzing, and responding to
 * insider threats, foreign intelligence activities, and deception operations.
 */

export * from './ThreatActorModelingService';
export * from './DeceptionDetectionEngine';
export * from './AnomalyCorrelationService';

// Re-export singleton instances
export { threatActorModelingService } from './ThreatActorModelingService';
export { deceptionDetectionEngine } from './DeceptionDetectionEngine';
export { anomalyCorrelationService } from './AnomalyCorrelationService';
