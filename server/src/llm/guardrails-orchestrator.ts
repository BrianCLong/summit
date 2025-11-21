/**
 * LLM Guardrails Orchestrator
 *
 * Production-ready orchestration of all LLM security components:
 * - Input validation and sanitization
 * - Rate limiting per user/model
 * - Content moderation
 * - PII detection and redaction
 * - Model routing with fallbacks
 * - Audit logging
 * - Metrics and monitoring
 */

import { Logger } from '../observability/logger.js';
import { Metrics } from '../observability/metrics.js';
import { LLMRateLimiter, llmRateLimiter, RateLimitResult } from './rate-limiter.js';
import { LLMModelRouter, llmRouter, RouteResult, RoutingContext, ModelConfig } from './model-router.js';
import { ContentModerationEngine, contentModeration, ModerationResult } from './content-moderation.js';
import { PIIDetector, piiDetector, PIIDetectionResult } from './pii-detector.js';
import { LLMAuditLogger, llmAuditLogger, AuditEntry } from './audit-logger.js';
import { PromptInjectionDetector } from '../security/llm-guardrails.js';

const logger = new Logger('LLMGuardrailsOrchestrator');
const metrics = new Metrics();

export interface GuardrailRequest {
  // User context
  userId: string;
  tenantId?: string;
  sessionId?: string;
  conversationId?: string;

  // Request details
  prompt: string;
  systemPrompt?: string;
  messages?: Array<{ role: string; content: string }>;

  // Model preferences
  preferredModel?: string;
  preferredProvider?: 'openai' | 'anthropic' | 'google';
  maxLatencyMs?: number;
  maxCost?: number;

  // Task type
  taskType?: 'completion' | 'chat' | 'embedding' | 'summarization' | 'extraction' | 'code';

  // Security options
  privacyLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
  skipPIIRedaction?: boolean;
  skipModeration?: boolean;
  enableDifferentialPrivacy?: boolean;

  // Request metadata
  clientIp?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface GuardrailResponse {
  // Status
  allowed: boolean;
  blocked: boolean;
  blockReason?: string;

  // Processed content
  processedPrompt: string;
  redactedPII: boolean;
  piiDetected: PIIDetectionResult | null;

  // Moderation
  moderationResult: ModerationResult | null;
  moderationAction: 'allow' | 'warn' | 'block' | 'review';

  // Rate limiting
  rateLimitResult: RateLimitResult;

  // Routing
  selectedModel: ModelConfig | null;
  fallbackModels: ModelConfig[];

  // Audit
  auditId: string;

  // Warnings
  warnings: string[];

  // Timing
  processingTimeMs: number;
}

export interface ExecutionResult<T = string> {
  success: boolean;
  content: T;
  error?: string;
  model: ModelConfig | null;
  attempts: number;
  totalTimeMs: number;
  auditId: string;
  guardrailResponse: GuardrailResponse;
}

/**
 * LLM Guardrails Orchestrator
 *
 * Main entry point for secured LLM interactions
 */
export class LLMGuardrailsOrchestrator {
  private rateLimiter: LLMRateLimiter;
  private router: LLMModelRouter;
  private moderator: ContentModerationEngine;
  private piiDetector: PIIDetector;
  private auditLogger: LLMAuditLogger;
  private injectionDetector: PromptInjectionDetector;

  constructor(options?: {
    rateLimiter?: LLMRateLimiter;
    router?: LLMModelRouter;
    moderator?: ContentModerationEngine;
    piiDetector?: PIIDetector;
    auditLogger?: LLMAuditLogger;
  }) {
    this.rateLimiter = options?.rateLimiter || llmRateLimiter;
    this.router = options?.router || llmRouter;
    this.moderator = options?.moderator || contentModeration;
    this.piiDetector = options?.piiDetector || piiDetector;
    this.auditLogger = options?.auditLogger || llmAuditLogger;
    this.injectionDetector = new PromptInjectionDetector();

    logger.info('LLM Guardrails Orchestrator initialized');
  }

  /**
   * Process a request through all guardrails
   */
  async processRequest(request: GuardrailRequest): Promise<GuardrailResponse> {
    const startTime = Date.now();
    const warnings: string[] = [];
    let processedPrompt = request.prompt;
    let blocked = false;
    let blockReason: string | undefined;

    // Initialize response
    const response: Partial<GuardrailResponse> = {
      allowed: true,
      blocked: false,
      warnings: [],
      piiDetected: null,
      moderationResult: null,
      moderationAction: 'allow',
      redactedPII: false,
      selectedModel: null,
      fallbackModels: [],
    };

    try {
      // 1. Prompt Injection Detection
      const injectionResult = this.injectionDetector.detect(request.prompt);
      if (injectionResult.injectionDetected) {
        blocked = true;
        blockReason = `Prompt injection detected (confidence: ${(injectionResult.confidence * 100).toFixed(1)}%)`;

        metrics.counter('llm_guardrail_blocked', { reason: 'prompt_injection' });
        logger.warn('Prompt injection blocked', {
          userId: request.userId,
          patterns: injectionResult.patterns,
          confidence: injectionResult.confidence,
        });
      }

      // 2. Rate Limiting
      const rateLimitResult = await this.rateLimiter.checkLimit({
        userId: request.userId,
        tenantId: request.tenantId,
        model: request.preferredModel || 'default',
        estimatedTokens: this.estimateTokens(request.prompt),
      });

      response.rateLimitResult = rateLimitResult;

      if (!rateLimitResult.allowed) {
        blocked = true;
        blockReason = rateLimitResult.reason || 'Rate limit exceeded';

        metrics.counter('llm_guardrail_blocked', { reason: 'rate_limit' });
        logger.warn('Rate limit blocked', {
          userId: request.userId,
          reason: rateLimitResult.reason,
          retryAfter: rateLimitResult.retryAfter,
        });
      }

      // 3. PII Detection and Redaction
      if (!blocked && !request.skipPIIRedaction) {
        const piiResult = this.piiDetector.detect(request.prompt);
        response.piiDetected = piiResult;

        if (piiResult.hasPII) {
          metrics.counter('llm_pii_detected', { types: piiResult.compliance.join(',') });

          // Redact based on privacy level
          if (request.privacyLevel === 'restricted' || request.privacyLevel === 'confidential') {
            processedPrompt = piiResult.redactedText;
            response.redactedPII = true;
            warnings.push(`PII redacted: ${piiResult.matches.length} items`);

            logger.info('PII redacted', {
              userId: request.userId,
              count: piiResult.matches.length,
              types: Object.keys(piiResult.summary),
            });
          } else {
            warnings.push(`PII detected: ${piiResult.matches.length} items (not redacted)`);
          }
        }
      }

      // 4. Content Moderation
      if (!blocked && !request.skipModeration) {
        const moderationResult = await this.moderator.moderateInput(processedPrompt, {
          userId: request.userId,
          tenantId: request.tenantId,
          model: request.preferredModel,
        });

        response.moderationResult = moderationResult;
        response.moderationAction = moderationResult.action;

        if (moderationResult.action === 'block') {
          blocked = true;
          blockReason = `Content moderation: ${moderationResult.reasons.join(', ')}`;

          metrics.counter('llm_guardrail_blocked', { reason: 'moderation' });
          logger.warn('Content moderation blocked', {
            userId: request.userId,
            reasons: moderationResult.reasons,
          });
        } else if (moderationResult.action === 'warn') {
          warnings.push(`Moderation warning: ${moderationResult.reasons.join(', ')}`);
        }
      }

      // 5. Model Routing
      if (!blocked) {
        try {
          const routingContext: RoutingContext = {
            taskType: request.taskType || 'completion',
            estimatedTokens: this.estimateTokens(processedPrompt),
            maxLatencyMs: request.maxLatencyMs,
            maxCost: request.maxCost,
            preferredProvider: request.preferredProvider,
            userId: request.userId,
          };

          const route = await this.router.route(routingContext);
          response.selectedModel = route.model;
          response.fallbackModels = route.fallbackChain;
        } catch (error) {
          warnings.push(`Routing warning: ${(error as Error).message}`);
          // Don't block, will use default model
        }
      }

      // 6. Audit Logging
      const auditId = await this.auditLogger.logRequest({
        userId: request.userId,
        tenantId: request.tenantId,
        sessionId: request.sessionId,
        conversationId: request.conversationId,
        modelProvider: response.selectedModel?.provider || 'unknown',
        modelName: response.selectedModel?.name || request.preferredModel || 'unknown',
        requestType: request.taskType || 'completion',
        prompt: processedPrompt,
        promptTokens: this.estimateTokens(processedPrompt),
        containsPII: response.piiDetected?.hasPII || false,
        piiTypes: response.piiDetected?.matches.map((m) => m.type),
        clientIp: request.clientIp,
        userAgent: request.userAgent,
        metadata: request.metadata,
      });

      response.auditId = auditId;

      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;
      metrics.histogram('llm_guardrail_processing_ms', processingTimeMs);

      return {
        allowed: !blocked,
        blocked,
        blockReason,
        processedPrompt,
        redactedPII: response.redactedPII || false,
        piiDetected: response.piiDetected || null,
        moderationResult: response.moderationResult || null,
        moderationAction: response.moderationAction || 'allow',
        rateLimitResult: response.rateLimitResult!,
        selectedModel: response.selectedModel || null,
        fallbackModels: response.fallbackModels || [],
        auditId: response.auditId!,
        warnings,
        processingTimeMs,
      };
    } catch (error) {
      logger.error('Guardrail processing error', {
        error: (error as Error).message,
        userId: request.userId,
      });

      metrics.counter('llm_guardrail_errors');

      // Fail closed for security
      return {
        allowed: false,
        blocked: true,
        blockReason: `Internal error: ${(error as Error).message}`,
        processedPrompt: request.prompt,
        redactedPII: false,
        piiDetected: null,
        moderationResult: null,
        moderationAction: 'block',
        rateLimitResult: { allowed: false, remaining: 0, resetAt: new Date() },
        selectedModel: null,
        fallbackModels: [],
        auditId: '',
        warnings: ['Processing error occurred'],
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute LLM request with guardrails and automatic fallback
   */
  async execute<T = string>(
    request: GuardrailRequest,
    executor: (prompt: string, model: ModelConfig) => Promise<T>
  ): Promise<ExecutionResult<T>> {
    const startTime = Date.now();

    // Process through guardrails
    const guardrailResponse = await this.processRequest(request);

    if (guardrailResponse.blocked) {
      return {
        success: false,
        content: '' as T,
        error: guardrailResponse.blockReason,
        model: null,
        attempts: 0,
        totalTimeMs: Date.now() - startTime,
        auditId: guardrailResponse.auditId,
        guardrailResponse,
      };
    }

    // Execute with fallback
    const route: RouteResult = {
      model: guardrailResponse.selectedModel!,
      fallbackChain: guardrailResponse.fallbackModels,
      estimatedCost: 0,
      estimatedLatency: 0,
    };

    try {
      const { result, model, attempts } = await this.router.executeWithFallback(
        route,
        async (m) => executor(guardrailResponse.processedPrompt, m)
      );

      // Moderate output
      let finalContent = result;
      if (typeof result === 'string' && !request.skipModeration) {
        const outputModeration = await this.moderator.moderateOutput(result, {
          userId: request.userId,
          tenantId: request.tenantId,
          model: model.name,
        });

        if (outputModeration.action === 'block') {
          // Log blocked output
          await this.auditLogger.logResponse({
            auditId: guardrailResponse.auditId,
            response: '[BLOCKED]',
            completionTime: Date.now() - startTime,
            moderationResult: 'blocked',
            blocked: true,
            blockReason: outputModeration.reasons.join(', '),
          });

          return {
            success: false,
            content: '' as T,
            error: `Output blocked: ${outputModeration.reasons.join(', ')}`,
            model,
            attempts,
            totalTimeMs: Date.now() - startTime,
            auditId: guardrailResponse.auditId,
            guardrailResponse,
          };
        }
      }

      // Record token usage
      if (typeof result === 'string') {
        this.rateLimiter.recordUsage(request.userId, this.estimateTokens(result));
      }

      // Log successful response
      await this.auditLogger.logResponse({
        auditId: guardrailResponse.auditId,
        response: typeof result === 'string' ? result : JSON.stringify(result),
        completionTime: Date.now() - startTime,
        guardrailsApplied: this.getAppliedGuardrails(guardrailResponse),
        riskScore: guardrailResponse.moderationResult?.scores
          .reduce((max, s) => Math.max(max, s.score), 0) || 0,
      });

      return {
        success: true,
        content: finalContent,
        model,
        attempts,
        totalTimeMs: Date.now() - startTime,
        auditId: guardrailResponse.auditId,
        guardrailResponse,
      };
    } catch (error) {
      // Log failed execution
      await this.auditLogger.logResponse({
        auditId: guardrailResponse.auditId,
        response: '',
        completionTime: Date.now() - startTime,
        blocked: true,
        blockReason: (error as Error).message,
      });

      return {
        success: false,
        content: '' as T,
        error: (error as Error).message,
        model: null,
        attempts: guardrailResponse.fallbackModels.length + 1,
        totalTimeMs: Date.now() - startTime,
        auditId: guardrailResponse.auditId,
        guardrailResponse,
      };
    }
  }

  /**
   * Get health status of all components
   */
  getHealth(): {
    healthy: boolean;
    components: Record<string, { healthy: boolean; details?: unknown }>;
  } {
    const routerHealth = this.router.getHealth();
    const rateLimiterMetrics = this.rateLimiter.getMetrics();

    return {
      healthy: routerHealth.healthy,
      components: {
        rateLimiter: {
          healthy: true,
          details: rateLimiterMetrics,
        },
        router: {
          healthy: routerHealth.healthy,
          details: {
            availableModels: routerHealth.availableModels,
            totalModels: routerHealth.totalModels,
          },
        },
        moderation: {
          healthy: true,
          details: this.moderator.getConfig(),
        },
        piiDetector: {
          healthy: true,
        },
        auditLogger: {
          healthy: true,
        },
      },
    };
  }

  /**
   * Set user tier for rate limiting
   */
  setUserTier(userId: string, tier: string): void {
    this.rateLimiter.setUserTier(userId, tier);
  }

  /**
   * Get user usage stats
   */
  getUserStats(userId: string) {
    return this.rateLimiter.getUsageStats(userId);
  }

  /**
   * GDPR: Delete user data
   */
  async deleteUserData(userId: string): Promise<{ auditRecords: number }> {
    const auditRecords = await this.auditLogger.deleteUserData(userId);
    return { auditRecords };
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  private getAppliedGuardrails(response: GuardrailResponse): string[] {
    const applied: string[] = ['injection_detection'];

    if (response.rateLimitResult) applied.push('rate_limiting');
    if (response.piiDetected) applied.push('pii_detection');
    if (response.redactedPII) applied.push('pii_redaction');
    if (response.moderationResult) applied.push('content_moderation');
    if (response.selectedModel) applied.push('model_routing');

    return applied;
  }
}

// Export singleton
export const guardrailsOrchestrator = new LLMGuardrailsOrchestrator();

// Export convenience function
export async function processWithGuardrails(
  request: GuardrailRequest
): Promise<GuardrailResponse> {
  return guardrailsOrchestrator.processRequest(request);
}

export async function executeWithGuardrails<T = string>(
  request: GuardrailRequest,
  executor: (prompt: string, model: ModelConfig) => Promise<T>
): Promise<ExecutionResult<T>> {
  return guardrailsOrchestrator.execute(request, executor);
}
