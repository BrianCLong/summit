/**
 * LLM Guardrails Service
 *
 * Comprehensive security layer for LLM interactions addressing:
 * 1. Prompt injection and adversarial attacks
 * 2. Transformer invertibility and privacy concerns
 * 3. Output validation and sanitization
 * 4. Audit logging for regulatory compliance
 * 5. Differential privacy for sensitive data
 *
 * Based on emerging standards:
 * - OWASP Top 10 for LLM Applications
 * - NIST AI Risk Management Framework
 * - MLCommons AI Safety Benchmarks
 */

import { Logger } from '../observability/logger.js';
import { Metrics } from '../observability/metrics.js';
import { SafetyV2Service } from '../safety/safety-v2.js';
import { isSuspicious } from '../services/guard.js';
import crypto from 'crypto';

const logger = new Logger('LLMGuardrails');
const metrics = new Metrics();

interface GuardrailCheckResult {
  allowed: boolean;
  reason?: string;
  risk_score: number;
  redacted_prompt?: string;
  audit_id?: string;
  warnings?: string[];
}

interface ModelInvertibilityAudit {
  audit_id: string;
  timestamp: Date;
  prompt_hash: string;
  user_id?: string;
  tenant_id?: string;
  model_provider: string;
  model_name: string;
  prompt_fingerprint: string; // For provenance tracking
  privacy_level: 'public' | 'internal' | 'confidential' | 'restricted';
  contains_pii: boolean;
  retention_policy: string;
}

interface DifferentialPrivacyConfig {
  epsilon: number; // Privacy budget
  delta: number; // Privacy loss probability
  noise_mechanism: 'laplace' | 'gaussian';
  sensitivity: number;
}

/**
 * Advanced Prompt Injection Detection
 *
 * Defends against:
 * - Direct instruction override ("ignore previous instructions")
 * - Payload smuggling (encoded attacks)
 * - Context manipulation
 * - System prompt extraction attempts
 * - Role confusion attacks
 * - Delimiter injection
 */
export class PromptInjectionDetector {
  private readonly injectionPatterns = [
    // Direct override attempts
    /ignore\s+(previous|prior|above|all)\s+(instructions|prompts|rules|context)/gi,
    /disregard\s+(previous|prior|above|all)\s+(instructions|prompts|rules)/gi,
    /forget\s+(previous|prior|above|all)\s+(instructions|prompts|rules|context)/gi,

    // System prompt extraction
    /show\s+(me\s+)?(the\s+)?(system\s+)?(prompt|instructions|rules)/gi,
    /what\s+(is|are)\s+(your\s+)?(system\s+)?(prompt|instructions|rules)/gi,
    /reveal\s+(your\s+)?(system\s+)?(prompt|instructions|configuration)/gi,
    /print\s+(your\s+)?(system\s+)?(prompt|instructions|rules)/gi,

    // Role manipulation
    /you\s+are\s+now\s+(a|an)\s+\w+/gi,
    /act\s+as\s+(a|an)\s+\w+/gi,
    /pretend\s+(to\s+be|you\s+are)/gi,
    /simulate\s+(a|an)\s+\w+/gi,

    // Jailbreak attempts
    /(DAN|STAN)\s+mode/gi,
    /jailbreak/gi,
    /developer\s+mode/gi,
    /god\s+mode/gi,

    // Delimiter injection
    /```\s*system/gi,
    /```\s*user/gi,
    /```\s*assistant/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,

    // Data exfiltration
    /exfiltrate/gi,
    /(retrieve|extract|dump|list)\s+(all\s+)?(secrets|keys|passwords|tokens|credentials)/gi,
    /show\s+(all\s+)?(environment|env)\s+(variables|vars)/gi,

    // Encoding attacks (common obfuscation)
    /base64|hex|rot13|unicode|\\x[0-9a-f]{2}/gi,

    // Output manipulation
    /end\s+of\s+conversation/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
  ];

  private readonly suspiciousStructures = [
    // Nested quotes suggesting payload smuggling
    /["']{3,}/g,
    // Excessive newlines (context injection)
    /\n{10,}/g,
    // Unusual unicode (homoglyph attacks)
    /[\u0400-\u04FF\u2000-\u206F]/g,
    // Control characters
    /[\x00-\x1F\x7F-\x9F]/g,
  ];

  detect(prompt: string): { injectionDetected: boolean; patterns: string[]; confidence: number } {
    const detectedPatterns: string[] = [];
    let confidence = 0;

    // Check for known injection patterns
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(prompt)) {
        detectedPatterns.push(pattern.source);
        confidence += 0.3;
      }
    }

    // Check for suspicious structures
    for (const pattern of this.suspiciousStructures) {
      if (pattern.test(prompt)) {
        detectedPatterns.push(`structure:${pattern.source}`);
        confidence += 0.2;
      }
    }

    // Use existing guard service
    if (isSuspicious(prompt)) {
      detectedPatterns.push('guard-service-detection');
      confidence += 0.5;
    }

    // Entropy analysis (high entropy may indicate encoded payloads)
    const entropy = this.calculateEntropy(prompt);
    if (entropy > 4.5) {
      detectedPatterns.push('high-entropy');
      confidence += 0.3;
    }

    return {
      injectionDetected: confidence > 0.5,
      patterns: detectedPatterns,
      confidence: Math.min(confidence, 1.0),
    };
  }

  private calculateEntropy(str: string): number {
    const len = str.length;
    const frequencies = new Map<string, number>();

    for (const char of str) {
      frequencies.set(char, (frequencies.get(char) || 0) + 1);
    }

    let entropy = 0;
    for (const count of frequencies.values()) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }
}

/**
 * Output Sanitizer and Validator
 *
 * Prevents:
 * - PII leakage in responses
 * - Credentials or secrets in output
 * - Harmful content generation
 * - Hallucinated data exposure
 */
export class OutputSanitizer {
  private readonly piiPatterns = [
    // Email addresses
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // Phone numbers
    /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    // SSN
    /\d{3}-\d{2}-\d{4}/g,
    // Credit cards
    /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
    // API keys (common formats)
    /(sk|pk)[-_][a-zA-Z0-9]{32,}/g,
    /[a-f0-9]{32,64}/g, // Potential secrets/hashes
  ];

  sanitize(output: string, privacyLevel: 'public' | 'internal' | 'confidential' | 'restricted'): {
    sanitized: string;
    redactions: number;
    piiDetected: boolean;
  } {
    let sanitized = output;
    let redactions = 0;
    let piiDetected = false;

    // Redact based on privacy level
    for (const pattern of this.piiPatterns) {
      const matches = sanitized.match(pattern);
      if (matches) {
        piiDetected = true;
        if (privacyLevel === 'restricted' || privacyLevel === 'confidential') {
          sanitized = sanitized.replace(pattern, '[REDACTED]');
          redactions += matches.length;
        }
      }
    }

    return { sanitized, redactions, piiDetected };
  }
}

/**
 * Model Invertibility Audit Logger
 *
 * Addresses transformer invertibility research:
 * - Logs prompt fingerprints for provenance tracking
 * - Enables post-hoc reconstruction detection
 * - Supports regulatory compliance (GDPR right to erasure)
 * - Provides audit trail for sensitive interactions
 */
export class InvertibilityAuditLogger {
  private audits: Map<string, ModelInvertibilityAudit> = new Map();

  /**
   * Create cryptographic fingerprint of prompt for provenance tracking
   */
  private createPromptFingerprint(prompt: string, salt: string): string {
    return crypto
      .createHmac('sha256', salt)
      .update(prompt)
      .digest('hex');
  }

  /**
   * Log LLM interaction for invertibility audit trail
   */
  async logInteraction(params: {
    prompt: string;
    userId?: string;
    tenantId?: string;
    modelProvider: string;
    modelName: string;
    privacyLevel: 'public' | 'internal' | 'confidential' | 'restricted';
    containsPii: boolean;
  }): Promise<string> {
    const auditId = crypto.randomUUID();
    const promptHash = crypto.createHash('sha256').update(params.prompt).digest('hex');
    const promptFingerprint = this.createPromptFingerprint(params.prompt, auditId);

    const audit: ModelInvertibilityAudit = {
      audit_id: auditId,
      timestamp: new Date(),
      prompt_hash: promptHash,
      user_id: params.userId,
      tenant_id: params.tenantId,
      model_provider: params.modelProvider,
      model_name: params.modelName,
      prompt_fingerprint: promptFingerprint,
      privacy_level: params.privacyLevel,
      contains_pii: params.containsPii,
      retention_policy: this.determineRetentionPolicy(params.privacyLevel, params.containsPii),
    };

    this.audits.set(auditId, audit);

    // Log for monitoring
    logger.info('LLM interaction audited', {
      audit_id: auditId,
      model: `${params.modelProvider}/${params.modelName}`,
      privacy_level: params.privacyLevel,
      contains_pii: params.containsPii,
    });

    // Emit metric
    metrics.counter('llm_interactions_audited', {
      provider: params.modelProvider,
      privacy_level: params.privacyLevel,
    });

    // TODO: Persist to database for long-term audit trail
    // await this.persistAudit(audit);

    return auditId;
  }

  /**
   * Verify if a prompt was previously processed (for deduplication/caching)
   */
  async verifyPromptProvenance(promptHash: string): Promise<ModelInvertibilityAudit | null> {
    for (const audit of this.audits.values()) {
      if (audit.prompt_hash === promptHash) {
        return audit;
      }
    }
    return null;
  }

  /**
   * Support GDPR right to erasure
   */
  async eraseUserData(userId: string): Promise<number> {
    let erased = 0;
    for (const [auditId, audit] of this.audits.entries()) {
      if (audit.user_id === userId) {
        this.audits.delete(auditId);
        erased++;
      }
    }
    logger.info('User LLM audit data erased', { user_id: userId, count: erased });
    return erased;
  }

  private determineRetentionPolicy(
    privacyLevel: string,
    containsPii: boolean
  ): string {
    if (privacyLevel === 'restricted' || containsPii) {
      return '30-days'; // Strict retention for sensitive data
    } else if (privacyLevel === 'confidential') {
      return '90-days';
    } else if (privacyLevel === 'internal') {
      return '1-year';
    } else {
      return '3-years';
    }
  }
}

/**
 * Differential Privacy for LLM Prompts
 *
 * Adds calibrated noise to prompts containing sensitive data
 * to prevent reconstruction via model invertibility
 */
export class DifferentialPrivacyEngine {
  private defaultConfig: DifferentialPrivacyConfig = {
    epsilon: 1.0, // Privacy budget
    delta: 1e-5, // Privacy loss probability
    noise_mechanism: 'gaussian',
    sensitivity: 1.0,
  };

  /**
   * Add differential privacy noise to sensitive prompts
   */
  applyNoise(prompt: string, config?: Partial<DifferentialPrivacyConfig>): string {
    const finalConfig = { ...this.defaultConfig, ...config };

    // For text, we use semantic perturbation rather than direct noise
    // This is a simplified approach - production would use embedding-space noise

    // Split into words
    const words = prompt.split(/\s+/);
    const noisyWords: string[] = [];

    for (let i = 0; i < words.length; i++) {
      // With probability based on epsilon, keep or perturb word
      const perturbProbability = Math.exp(-finalConfig.epsilon);

      if (Math.random() > perturbProbability) {
        noisyWords.push(words[i]);
      } else {
        // Add semantic noise (synonym replacement, generalization)
        noisyWords.push(this.perturbWord(words[i]));
      }
    }

    return noisyWords.join(' ');
  }

  private perturbWord(word: string): string {
    // Simple generalization heuristic
    // Production would use word embeddings and synonym databases

    // Detect and generalize numbers
    if (/^\d+$/.test(word)) {
      const num = parseInt(word, 10);
      // Round to nearest power of 10
      const magnitude = Math.pow(10, Math.floor(Math.log10(num)));
      return `~${Math.round(num / magnitude) * magnitude}`;
    }

    // Keep word as-is (would use NLP for synonym replacement)
    return word;
  }
}

/**
 * Main LLM Guardrails Service
 *
 * Coordinates all security checks for LLM interactions
 */
export class LLMGuardrailsService {
  private injectionDetector = new PromptInjectionDetector();
  private outputSanitizer = new OutputSanitizer();
  private auditLogger = new InvertibilityAuditLogger();
  private privacyEngine = new DifferentialPrivacyEngine();
  private safetyService?: SafetyV2Service;

  constructor() {
    logger.info('LLM Guardrails Service initialized');
  }

  /**
   * Comprehensive input validation before LLM processing
   */
  async validateInput(params: {
    prompt: string;
    userId?: string;
    tenantId?: string;
    modelProvider: string;
    modelName: string;
    privacyLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
    applyDifferentialPrivacy?: boolean;
  }): Promise<GuardrailCheckResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    let riskScore = 0;
    let processedPrompt = params.prompt;

    // 1. Prompt injection detection
    const injectionResult = this.injectionDetector.detect(params.prompt);
    if (injectionResult.injectionDetected) {
      logger.warn('Prompt injection detected', {
        user_id: params.userId,
        patterns: injectionResult.patterns,
        confidence: injectionResult.confidence,
      });

      metrics.counter('llm_prompt_injection_blocked', {
        provider: params.modelProvider,
      });

      return {
        allowed: false,
        reason: 'Prompt injection attack detected',
        risk_score: injectionResult.confidence,
        warnings: injectionResult.patterns,
      };
    }

    // 2. SafetyV2 integration (if available)
    if (this.safetyService) {
      try {
        const safetyCheck = await this.safetyService.validate({
          content: params.prompt,
          context: {
            userId: params.userId,
            tenantId: params.tenantId,
            operation: 'llm_query',
          },
        });

        if (!safetyCheck.safe) {
          logger.warn('Safety check failed', {
            user_id: params.userId,
            violations: safetyCheck.violations,
          });

          return {
            allowed: false,
            reason: `Safety violations: ${safetyCheck.violations?.join(', ')}`,
            risk_score: safetyCheck.risk_score || 0.8,
          };
        }

        riskScore = Math.max(riskScore, safetyCheck.risk_score || 0);
        if (safetyCheck.warnings) {
          warnings.push(...safetyCheck.warnings);
        }
      } catch (error) {
        logger.error('SafetyV2 check failed', error as Error);
        warnings.push('Safety check unavailable');
      }
    }

    // 3. PII detection for invertibility concerns
    const piiCheck = this.outputSanitizer.sanitize(params.prompt, params.privacyLevel || 'internal');
    const containsPii = piiCheck.piiDetected;

    if (containsPii) {
      warnings.push('PII detected in prompt');
      riskScore = Math.max(riskScore, 0.6);
    }

    // 4. Apply differential privacy if requested or PII detected
    if ((params.applyDifferentialPrivacy || containsPii) && params.privacyLevel === 'restricted') {
      processedPrompt = this.privacyEngine.applyNoise(processedPrompt);
      warnings.push('Differential privacy applied');
      logger.info('Differential privacy applied to prompt', { user_id: params.userId });
    }

    // 5. Audit logging for invertibility tracking
    const auditId = await this.auditLogger.logInteraction({
      prompt: processedPrompt,
      userId: params.userId,
      tenantId: params.tenantId,
      modelProvider: params.modelProvider,
      modelName: params.modelName,
      privacyLevel: params.privacyLevel || 'internal',
      containsPii,
    });

    // 6. Metrics
    const latency = Date.now() - startTime;
    metrics.histogram('llm_guardrail_validation_latency_ms', latency, {
      provider: params.modelProvider,
    });

    metrics.counter('llm_inputs_validated', {
      provider: params.modelProvider,
      privacy_level: params.privacyLevel || 'internal',
      contains_pii: String(containsPii),
    });

    return {
      allowed: true,
      risk_score: riskScore,
      redacted_prompt: processedPrompt !== params.prompt ? processedPrompt : undefined,
      audit_id: auditId,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate and sanitize LLM outputs
   */
  async validateOutput(params: {
    output: string;
    auditId?: string;
    privacyLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
  }): Promise<{ safe: boolean; sanitized: string; warnings?: string[] }> {
    const warnings: string[] = [];
    const privacyLevel = params.privacyLevel || 'internal';

    // 1. Sanitize PII in output
    const sanitized = this.outputSanitizer.sanitize(params.output, privacyLevel);

    if (sanitized.piiDetected) {
      warnings.push(`PII redacted: ${sanitized.redactions} occurrences`);
      logger.warn('PII detected in LLM output', {
        audit_id: params.auditId,
        redactions: sanitized.redactions,
      });

      metrics.counter('llm_output_pii_redacted', {
        privacy_level: privacyLevel,
      });
    }

    // 2. Check for harmful content (placeholder - would integrate content classifier)
    const harmfulPatterns = [
      /\b(kill|harm|attack|destroy)\s+(someone|people|person)/gi,
      /instructions\s+for\s+(making|building)\s+(bomb|weapon|explosive)/gi,
    ];

    let containsHarmfulContent = false;
    for (const pattern of harmfulPatterns) {
      if (pattern.test(params.output)) {
        containsHarmfulContent = true;
        warnings.push('Potentially harmful content detected');
        break;
      }
    }

    if (containsHarmfulContent) {
      logger.error('Harmful content in LLM output', { audit_id: params.auditId });
      metrics.counter('llm_harmful_output_blocked');

      return {
        safe: false,
        sanitized: '[Content blocked due to safety concerns]',
        warnings,
      };
    }

    return {
      safe: true,
      sanitized: sanitized.sanitized,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Emergency stop - terminate LLM interaction
   */
  emergencyStop(reason: string, context?: Record<string, unknown>): void {
    logger.error('LLM EMERGENCY STOP', { reason, context });
    metrics.counter('llm_emergency_stops', { reason });

    // TODO: Trigger incident response workflow
    // TODO: Notify security team
    // TODO: Quarantine affected sessions
  }

  /**
   * Support GDPR right to erasure
   */
  async eraseUserData(userId: string): Promise<void> {
    const count = await this.auditLogger.eraseUserData(userId);
    logger.info('User LLM data erased per GDPR', { user_id: userId, audit_records: count });
  }

  /**
   * Health check for monitoring
   */
  getHealth(): { healthy: boolean; checks: Record<string, boolean> } {
    return {
      healthy: true,
      checks: {
        injection_detector: !!this.injectionDetector,
        output_sanitizer: !!this.outputSanitizer,
        audit_logger: !!this.auditLogger,
        privacy_engine: !!this.privacyEngine,
      },
    };
  }
}

// Export singleton instance
export const llmGuardrails = new LLMGuardrailsService();
