/**
 * XAI Overlay Service
 *
 * Provides comprehensive explainability for model outputs including:
 * - Input summaries and model metadata tracking
 * - Saliency maps and feature importance explanations
 * - Cryptographic signing of reasoning traces
 * - Tamper detection with dual-control override
 * - External verification for reproducibility
 */

export {
  XAIOverlayService,
  xaiOverlay,
  type ModelMetadata,
  type InputSummary,
  type SaliencyExplanation,
  type ReasoningTrace,
  type TamperDetectionResult,
  type ReproducibilityCheck,
} from './XAIOverlayService.js';

export {
  ExternalVerifier,
  externalVerifier,
  type VerificationRequest,
  type VerificationResult,
  type CheckResult,
  type ParameterSweepResult,
} from './ExternalVerifier.js';
