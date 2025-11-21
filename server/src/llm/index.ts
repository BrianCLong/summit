/**
 * LLM Guardrails Module
 *
 * Production-ready security layer for LLM interactions
 */

// Core components
export {
  LLMRateLimiter,
  llmRateLimiter,
  RATE_LIMIT_TIERS,
  MODEL_RATE_LIMITS,
  type RateLimitConfig,
  type RateLimitResult,
} from './rate-limiter.js';

export {
  LLMModelRouter,
  llmRouter,
  CircuitBreaker,
  type ModelConfig,
  type ModelProvider,
  type RouteResult,
  type RoutingContext,
  type CircuitBreakerState,
} from './model-router.js';

export {
  ContentModerationEngine,
  contentModeration,
  type ModerationCategory,
  type ModerationScore,
  type ModerationResult,
  type ModerationConfig,
  type ModerationHook,
  type ModerationContext,
  type ModerationHookResult,
} from './content-moderation.js';

export {
  PIIDetector,
  piiDetector,
  type PIIType,
  type PIIMatch,
  type PIIDetectionResult,
  type PIIConfig,
} from './pii-detector.js';

export {
  LLMAuditLogger,
  llmAuditLogger,
  type AuditEntry,
  type AuditQuery,
  type AuditStats,
  type RetentionPolicy,
} from './audit-logger.js';

// Main orchestrator
export {
  LLMGuardrailsOrchestrator,
  guardrailsOrchestrator,
  processWithGuardrails,
  executeWithGuardrails,
  type GuardrailRequest,
  type GuardrailResponse,
  type ExecutionResult,
} from './guardrails-orchestrator.js';
