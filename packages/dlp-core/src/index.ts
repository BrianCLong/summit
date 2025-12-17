/**
 * @package dlp-core
 *
 * Core Data Loss Prevention library for IntelGraph
 *
 * Provides:
 * - Content inspection and pattern detection
 * - Information barrier enforcement
 * - Redaction engine
 * - Policy evaluation integration with OPA
 * - Audit logging
 */

// Core services
export { DLPService } from './DLPService';
export { DetectionEngine } from './DetectionEngine';
export { RedactionEngine } from './RedactionEngine';
export { BarrierEnforcer } from './BarrierEnforcer';

// Types
export type {
  // Detection
  DetectionResult,
  DetectedPattern,
  PatternConfig,
  DetectionContext,

  // Content
  ContentScanRequest,
  ContentScanResult,
  ScanAction,

  // Barriers
  BarrierCheckRequest,
  BarrierCheckResult,
  BarrierViolation,
  BarrierType,

  // Redaction
  RedactionRequest,
  RedactionResult,
  RedactionStrategy,
  RedactionConfig,

  // Policy
  DLPPolicy,
  DLPRule,
  DLPException,
  ExceptionRequest,
  ExceptionApproval,

  // Audit
  DLPAuditEvent,
  DLPEventType,
} from './types';

// Errors
export {
  DLPError,
  DetectionError,
  BarrierViolationError,
  RedactionError,
  PolicyEvaluationError,
} from './errors';

// Utilities
export { createDLPMiddleware } from './middleware';
export { DLPApolloPlugin } from './apollo-plugin';
export { DLPStorageHook } from './storage-hook';

// Constants
export {
  DATA_CLASSIFICATIONS,
  BARRIER_TYPES,
  SCAN_ACTIONS,
  REDACTION_STRATEGIES,
} from './constants';
