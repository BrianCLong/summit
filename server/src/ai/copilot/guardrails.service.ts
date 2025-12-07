/**
 * Copilot Guardrails Service
 *
 * Enforces critical guardrails for copilot responses:
 * - No answer without citations
 * - Policy/authorization boundary enforcement
 * - Clear refusal messages with reasons
 * - Risky prompt logging for red-team review
 */

import { randomUUID } from 'crypto';
import crypto from 'crypto';
import pino from 'pino';
import { z } from 'zod';

import {
  type CopilotAnswer,
  type CopilotRefusal,
  type Citation,
  type Provenance,
  type GuardrailCheck,
  type RiskyPromptLog,
  type RiskLevel,
  CopilotRefusalSchema,
  RiskyPromptLogSchema,
} from './types.js';
import { PromptInjectionDetector } from '../../security/llm-guardrails.js';

const logger = pino({ name: 'guardrails-service' });

// Configuration
const REQUIRE_CITATIONS =
  process.env.COPILOT_REQUIRE_CITATIONS !== 'false';
const MIN_CITATIONS_REQUIRED = parseInt(
  process.env.COPILOT_MIN_CITATIONS || '1',
  10,
);
const MIN_CONFIDENCE_THRESHOLD = parseFloat(
  process.env.COPILOT_MIN_CONFIDENCE || '0.1',
);
const LOG_RISKY_PROMPTS = process.env.COPILOT_LOG_RISKY_PROMPTS !== 'false';
const RISK_SCORE_THRESHOLD = parseFloat(
  process.env.COPILOT_RISK_THRESHOLD || '0.5',
);

/**
 * Guardrail configuration
 */
export interface GuardrailConfig {
  /** Require citations for answers */
  requireCitations: boolean;
  /** Minimum citations required */
  minCitationsRequired: number;
  /** Minimum confidence threshold */
  minConfidenceThreshold: number;
  /** Log risky prompts for review */
  logRiskyPrompts: boolean;
  /** Risk score threshold for logging */
  riskScoreThreshold: number;
  /** Block high-risk prompts */
  blockHighRiskPrompts: boolean;
  /** Maximum answer length */
  maxAnswerLength: number;
  /** Allowed entity types */
  allowedEntityTypes?: string[];
  /** Denied keywords in prompts */
  deniedKeywords: string[];
}

/**
 * Default guardrail configuration
 */
const DEFAULT_CONFIG: GuardrailConfig = {
  requireCitations: REQUIRE_CITATIONS,
  minCitationsRequired: MIN_CITATIONS_REQUIRED,
  minConfidenceThreshold: MIN_CONFIDENCE_THRESHOLD,
  logRiskyPrompts: LOG_RISKY_PROMPTS,
  riskScoreThreshold: RISK_SCORE_THRESHOLD,
  blockHighRiskPrompts: true,
  maxAnswerLength: 10000,
  deniedKeywords: [
    'delete all',
    'drop database',
    'export credentials',
    'bypass',
    'ignore restrictions',
  ],
};

/**
 * Guardrail check name enumeration
 */
export type GuardrailCheckName =
  | 'has_citations'
  | 'min_citations_met'
  | 'has_provenance'
  | 'confidence_threshold'
  | 'answer_not_empty'
  | 'answer_length_limit'
  | 'no_injection_detected'
  | 'no_denied_keywords'
  | 'policy_compliant';

/**
 * Individual guardrail result
 */
interface GuardrailResult {
  name: GuardrailCheckName;
  passed: boolean;
  reason?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Copilot Guardrails Service
 */
export class GuardrailsService {
  private readonly config: GuardrailConfig;
  private readonly injectionDetector: PromptInjectionDetector;
  private readonly riskyPromptLogs: RiskyPromptLog[] = [];

  constructor(config?: Partial<GuardrailConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.injectionDetector = new PromptInjectionDetector();
  }

  /**
   * Validate a copilot answer against guardrails
   */
  validateAnswer(
    answer: CopilotAnswer,
    originalPrompt: string,
  ): {
    valid: boolean;
    checks: GuardrailCheck;
    refusal?: CopilotRefusal;
  } {
    const results: GuardrailResult[] = [];

    // Check 1: Has citations
    const hasCitations = answer.citations.length > 0;
    results.push({
      name: 'has_citations',
      passed: !this.config.requireCitations || hasCitations,
      reason: hasCitations ? undefined : 'Answer has no citations',
      severity: this.config.requireCitations ? 'error' : 'warning',
    });

    // Check 2: Minimum citations met
    const minCitationsMet =
      answer.citations.length >= this.config.minCitationsRequired;
    results.push({
      name: 'min_citations_met',
      passed: minCitationsMet,
      reason: minCitationsMet
        ? undefined
        : `Only ${answer.citations.length} citations, need ${this.config.minCitationsRequired}`,
      severity: 'warning',
    });

    // Check 3: Has provenance
    const hasProvenance =
      answer.provenance.entityIds.length > 0 ||
      answer.provenance.evidenceIds.length > 0 ||
      answer.provenance.claimIds.length > 0;
    results.push({
      name: 'has_provenance',
      passed: hasProvenance,
      reason: hasProvenance ? undefined : 'Answer has no provenance chain',
      severity: 'warning',
    });

    // Check 4: Confidence threshold
    const meetsConfidence =
      answer.confidence >= this.config.minConfidenceThreshold;
    results.push({
      name: 'confidence_threshold',
      passed: meetsConfidence,
      reason: meetsConfidence
        ? undefined
        : `Confidence ${answer.confidence.toFixed(2)} below threshold ${this.config.minConfidenceThreshold}`,
      severity: 'warning',
    });

    // Check 5: Answer not empty
    const hasContent = answer.answer.trim().length > 10;
    results.push({
      name: 'answer_not_empty',
      passed: hasContent,
      reason: hasContent ? undefined : 'Answer is empty or too short',
      severity: 'error',
    });

    // Check 6: Answer length limit
    const withinLength = answer.answer.length <= this.config.maxAnswerLength;
    results.push({
      name: 'answer_length_limit',
      passed: withinLength,
      reason: withinLength
        ? undefined
        : `Answer exceeds ${this.config.maxAnswerLength} characters`,
      severity: 'warning',
    });

    // Check 7: No prompt injection in original
    const injectionResult = this.injectionDetector.detect(originalPrompt);
    results.push({
      name: 'no_injection_detected',
      passed: !injectionResult.injectionDetected,
      reason: injectionResult.injectionDetected
        ? `Injection patterns detected: ${injectionResult.patterns.slice(0, 3).join(', ')}`
        : undefined,
      severity: 'critical',
    });

    // Check 8: No denied keywords
    const deniedKeywordsFound = this.findDeniedKeywords(originalPrompt);
    results.push({
      name: 'no_denied_keywords',
      passed: deniedKeywordsFound.length === 0,
      reason:
        deniedKeywordsFound.length > 0
          ? `Denied keywords found: ${deniedKeywordsFound.join(', ')}`
          : undefined,
      severity: 'error',
    });

    // Aggregate results
    const allPassed = results.every((r) => r.passed);
    const criticalFailed = results.some(
      (r) => !r.passed && r.severity === 'critical',
    );
    const errorFailed = results.some(
      (r) => !r.passed && r.severity === 'error',
    );

    const checks: GuardrailCheck = {
      passed: allPassed,
      checks: results.map((r) => ({
        name: r.name,
        passed: r.passed,
        reason: r.reason,
      })),
      failureReason: allPassed
        ? undefined
        : results.find((r) => !r.passed)?.reason,
    };

    // Generate refusal if critical/error guardrails failed
    let refusal: CopilotRefusal | undefined;
    if (criticalFailed || (errorFailed && this.config.requireCitations)) {
      refusal = this.createRefusal(results, answer.investigationId);
    }

    // Log for red-team review if risky
    if (this.config.logRiskyPrompts) {
      this.logRiskyPromptIfNeeded(originalPrompt, results, answer.answerId);
    }

    return {
      valid: allPassed && !criticalFailed,
      checks,
      refusal,
    };
  }

  /**
   * Pre-validate a prompt before processing
   */
  validatePrompt(
    prompt: string,
    userId?: string,
    tenantId?: string,
  ): {
    allowed: boolean;
    riskLevel: RiskLevel;
    reason?: string;
    suggestions?: string[];
  } {
    // Check for injection
    const injectionResult = this.injectionDetector.detect(prompt);
    if (
      injectionResult.injectionDetected &&
      injectionResult.confidence > this.config.riskScoreThreshold
    ) {
      this.logRiskyPrompt(prompt, 'critical', injectionResult.patterns, true, userId, tenantId);

      return {
        allowed: false,
        riskLevel: 'critical',
        reason: 'Prompt injection detected',
        suggestions: [
          'Remove suspicious patterns from your question',
          'Ask a straightforward question about the data',
        ],
      };
    }

    // Check for denied keywords
    const deniedKeywords = this.findDeniedKeywords(prompt);
    if (deniedKeywords.length > 0) {
      this.logRiskyPrompt(
        prompt,
        'high',
        deniedKeywords.map((k) => `denied_keyword:${k}`),
        this.config.blockHighRiskPrompts,
        userId,
        tenantId,
      );

      if (this.config.blockHighRiskPrompts) {
        return {
          allowed: false,
          riskLevel: 'high',
          reason: `Query contains restricted terms: ${deniedKeywords.join(', ')}`,
          suggestions: [
            'Rephrase your question without restricted terms',
            'Contact your administrator for assistance with this query',
          ],
        };
      }
    }

    // Check prompt length
    if (prompt.length > 2000) {
      return {
        allowed: false,
        riskLevel: 'medium',
        reason: 'Prompt exceeds maximum length (2000 characters)',
        suggestions: ['Break your question into smaller parts'],
      };
    }

    // Calculate risk level based on patterns
    const riskLevel = this.calculateRiskLevel(prompt, injectionResult);

    // Log medium+ risk prompts for review
    if (
      this.config.logRiskyPrompts &&
      (riskLevel === 'medium' || riskLevel === 'high')
    ) {
      this.logRiskyPrompt(
        prompt,
        riskLevel,
        injectionResult.patterns,
        false,
        userId,
        tenantId,
      );
    }

    return {
      allowed: true,
      riskLevel,
    };
  }

  /**
   * Create a refusal response
   */
  createRefusal(
    failedResults: GuardrailResult[],
    investigationId: string,
  ): CopilotRefusal {
    const criticalFailure = failedResults.find(
      (r) => !r.passed && r.severity === 'critical',
    );
    const errorFailure = failedResults.find(
      (r) => !r.passed && r.severity === 'error',
    );
    const primaryFailure = criticalFailure || errorFailure || failedResults.find((r) => !r.passed);

    // Determine category
    let category: CopilotRefusal['category'] = 'internal_error';
    if (criticalFailure?.name === 'no_injection_detected') {
      category = 'policy_violation';
    } else if (
      primaryFailure?.name === 'has_citations' ||
      primaryFailure?.name === 'min_citations_met'
    ) {
      category = 'no_citations_available';
    } else if (primaryFailure?.name === 'no_denied_keywords') {
      category = 'policy_violation';
    } else if (!primaryFailure?.passed) {
      category = 'unsafe_query';
    }

    // Generate suggestions based on failure type
    const suggestions = this.generateSuggestions(primaryFailure);

    return {
      refusalId: randomUUID(),
      reason: primaryFailure?.reason || 'Request could not be processed',
      category,
      suggestions,
      timestamp: new Date().toISOString(),
      auditId: randomUUID(),
    };
  }

  /**
   * Create a refusal for policy/authorization violations
   */
  createPolicyRefusal(
    reason: string,
    context?: Record<string, any>,
  ): CopilotRefusal {
    logger.warn({ reason, context }, 'Policy refusal created');

    return {
      refusalId: randomUUID(),
      reason,
      category: 'authorization_denied',
      suggestions: [
        'Contact your administrator if you believe you should have access',
        'Try a more limited query scope',
        'Check your authorization level for this investigation',
      ],
      timestamp: new Date().toISOString(),
      auditId: randomUUID(),
    };
  }

  /**
   * Find denied keywords in prompt
   */
  private findDeniedKeywords(prompt: string): string[] {
    const lowerPrompt = prompt.toLowerCase();
    return this.config.deniedKeywords.filter((keyword) =>
      lowerPrompt.includes(keyword.toLowerCase()),
    );
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(
    prompt: string,
    injectionResult: { confidence: number; patterns: string[] },
  ): RiskLevel {
    if (injectionResult.confidence > 0.8) {
      return 'critical';
    }
    if (injectionResult.confidence > 0.5) {
      return 'high';
    }
    if (injectionResult.patterns.length > 0) {
      return 'medium';
    }
    if (prompt.length > 1000) {
      return 'low';
    }
    return 'low';
  }

  /**
   * Generate suggestions based on failure
   */
  private generateSuggestions(failure?: GuardrailResult): string[] {
    if (!failure) {
      return ['Please try again with a different question'];
    }

    switch (failure.name) {
      case 'has_citations':
      case 'min_citations_met':
        return [
          'Try asking about entities that exist in the investigation',
          'Be more specific about which data you want to query',
          'Start with a simpler question to verify data exists',
        ];
      case 'has_provenance':
        return [
          'Ensure your question relates to documented evidence',
          'Try querying specific entities by name or ID',
        ];
      case 'confidence_threshold':
        return [
          'Ask a more specific question',
          'Provide additional context or constraints',
          'Try a simpler query first to verify data availability',
        ];
      case 'answer_not_empty':
        return [
          'Rephrase your question',
          'Check if the investigation has the data you need',
        ];
      case 'no_injection_detected':
        return [
          'Remove any system prompt or instruction override attempts',
          'Ask a straightforward question about the data',
          'Avoid special formatting or code-like syntax',
        ];
      case 'no_denied_keywords':
        return [
          'Remove restricted terms from your question',
          'Rephrase without administrative commands',
        ];
      default:
        return ['Please try a different approach'];
    }
  }

  /**
   * Log a risky prompt for red-team review
   */
  private logRiskyPrompt(
    prompt: string,
    riskLevel: RiskLevel,
    riskFactors: string[],
    blocked: boolean,
    userId?: string,
    tenantId?: string,
  ): void {
    const logEntry: RiskyPromptLog = {
      logId: randomUUID(),
      promptHash: crypto.createHash('sha256').update(prompt).digest('hex'),
      sanitizedPrompt: this.sanitizePromptForLogging(prompt),
      riskLevel,
      riskFactors,
      blocked,
      blockReason: blocked ? 'Guardrail policy' : undefined,
      userIdHash: userId
        ? crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16)
        : undefined,
      tenantId,
      timestamp: new Date().toISOString(),
      requiresReview: riskLevel === 'high' || riskLevel === 'critical',
    };

    this.riskyPromptLogs.push(logEntry);

    // Keep logs bounded
    if (this.riskyPromptLogs.length > 10000) {
      this.riskyPromptLogs.shift();
    }

    logger.warn(
      {
        logId: logEntry.logId,
        riskLevel,
        riskFactors: riskFactors.slice(0, 5),
        blocked,
        requiresReview: logEntry.requiresReview,
      },
      'Risky prompt logged for review',
    );
  }

  /**
   * Log risky prompt if validation results indicate risk
   */
  private logRiskyPromptIfNeeded(
    prompt: string,
    results: GuardrailResult[],
    answerId: string,
  ): void {
    const failedCritical = results.filter(
      (r) => !r.passed && r.severity === 'critical',
    );
    const failedErrors = results.filter(
      (r) => !r.passed && r.severity === 'error',
    );

    if (failedCritical.length > 0) {
      this.logRiskyPrompt(
        prompt,
        'critical',
        failedCritical.map((r) => r.name),
        true,
      );
    } else if (failedErrors.length > 0) {
      this.logRiskyPrompt(
        prompt,
        'high',
        failedErrors.map((r) => r.name),
        false,
      );
    }
  }

  /**
   * Sanitize prompt for logging (remove PII)
   */
  private sanitizePromptForLogging(prompt: string): string {
    let sanitized = prompt;

    // Remove potential PII patterns
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
    sanitized = sanitized.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      '[EMAIL]',
    );
    sanitized = sanitized.replace(
      /\b(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g,
      '[PHONE]',
    );

    // Truncate if too long
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 500) + '... [truncated]';
    }

    return sanitized;
  }

  /**
   * Get risky prompts requiring review
   */
  getRiskyPromptsForReview(): RiskyPromptLog[] {
    return this.riskyPromptLogs.filter((log) => log.requiresReview);
  }

  /**
   * Get all risky prompt logs
   */
  getAllRiskyPromptLogs(): RiskyPromptLog[] {
    return [...this.riskyPromptLogs];
  }

  /**
   * Mark a risky prompt as reviewed
   */
  markAsReviewed(logId: string): boolean {
    const log = this.riskyPromptLogs.find((l) => l.logId === logId);
    if (log) {
      log.requiresReview = false;
      return true;
    }
    return false;
  }

  /**
   * Get guardrail statistics
   */
  getStats(): {
    totalRiskyPrompts: number;
    pendingReview: number;
    blockedCount: number;
    riskLevelCounts: Record<RiskLevel, number>;
  } {
    const riskLevelCounts: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let blockedCount = 0;

    for (const log of this.riskyPromptLogs) {
      riskLevelCounts[log.riskLevel]++;
      if (log.blocked) blockedCount++;
    }

    return {
      totalRiskyPrompts: this.riskyPromptLogs.length,
      pendingReview: this.riskyPromptLogs.filter((l) => l.requiresReview).length,
      blockedCount,
      riskLevelCounts,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GuardrailConfig>): void {
    Object.assign(this.config, config);
    logger.info({ config: this.config }, 'Guardrail config updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): GuardrailConfig {
    return { ...this.config };
  }
}

/**
 * Create a guardrails service
 */
export function createGuardrailsService(
  config?: Partial<GuardrailConfig>,
): GuardrailsService {
  return new GuardrailsService(config);
}

/**
 * Singleton instance
 */
let serviceInstance: GuardrailsService | null = null;

/**
 * Get the singleton guardrails service
 */
export function getGuardrailsService(): GuardrailsService {
  if (!serviceInstance) {
    serviceInstance = new GuardrailsService();
  }
  return serviceInstance;
}
