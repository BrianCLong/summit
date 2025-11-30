import type {
  LanguageCode,
  TranslationContext,
  TranslationResult,
  TranslationServiceConfig,
  BatchTranslationRequest,
  BatchTranslationResult,
  TranslationPolicy,
} from '../types/index.js';
import { TranslationError, TranslationErrorCode } from '../types/index.js';
import { LanguageDetector, getLanguageDetector } from './language-detector.js';
import {
  TranslationProviderFactory,
  type TranslationProvider,
} from './translation-provider.js';
import {
  isTranslationAllowed,
  getPolicyForClassification,
  DEFAULT_POLICY,
} from '../config/translation-policies.js';
import { isLanguageSupported } from '../config/supported-languages.js';
import { MetricsCollector } from './metrics.js';

/**
 * Translation service with policy-aware translation
 */
export class TranslationService {
  private config: TranslationServiceConfig;
  private provider: TranslationProvider;
  private detector: LanguageDetector;
  private metrics: MetricsCollector;
  private cache: Map<string, TranslationResult>;

  constructor(config: TranslationServiceConfig) {
    this.config = config;
    this.detector = getLanguageDetector();
    this.metrics = new MetricsCollector();
    this.cache = new Map();
  }

  /**
   * Initialize the translation service
   */
  async initialize(): Promise<void> {
    this.provider = await TranslationProviderFactory.createProvider(
      this.config
    );
  }

  /**
   * Translate text with policy enforcement
   */
  async translate(
    text: string,
    context: TranslationContext
  ): Promise<TranslationResult> {
    this.metrics.incrementRequests();

    try {
      // Validate input
      this.validateInput(text);

      // Determine source language
      const sourceLanguage = await this.determineSourceLanguage(
        text,
        context.sourceLanguage
      );

      const targetLanguage = context.targetLanguage;

      // Check if translation is needed (same language)
      if (sourceLanguage === targetLanguage) {
        return this.createResult(
          text,
          sourceLanguage,
          targetLanguage,
          false,
          { allowed: true }
        );
      }

      // Check cache
      const cacheKey = this.getCacheKey(text, sourceLanguage, targetLanguage);
      if (this.config.enableCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        this.metrics.incrementSuccess();
        return cached;
      }

      // Get policy
      const policy = this.getEffectivePolicy(context);

      // Check policy
      const policyCheck = isTranslationAllowed(policy, targetLanguage);
      if (!policyCheck.allowed) {
        this.metrics.incrementPolicyViolations();
        return this.createResult(text, sourceLanguage, targetLanguage, false, {
          allowed: false,
          reason: policyCheck.reason,
        });
      }

      // Perform translation
      const translatedText = await this.provider.translate(
        text,
        sourceLanguage,
        targetLanguage
      );

      const result = this.createResult(
        translatedText,
        sourceLanguage,
        targetLanguage,
        true,
        { allowed: true }
      );

      // Update metrics
      this.metrics.incrementSuccess();
      this.metrics.recordLanguagePair(sourceLanguage, targetLanguage);
      this.metrics.recordProvider(this.provider.name);

      // Cache result
      if (this.config.enableCache) {
        this.cache.set(cacheKey, result);
      }

      // Audit log
      this.auditLog(context, result);

      return result;
    } catch (error) {
      this.metrics.incrementFailures();
      throw this.handleError(error);
    }
  }

  /**
   * Batch translate multiple texts
   */
  async translateBatch(
    request: BatchTranslationRequest
  ): Promise<BatchTranslationResult> {
    const results: TranslationResult[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < request.texts.length; i++) {
      try {
        const result = await this.translate(request.texts[i], request.context);
        results.push(result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push({ index: i, error: errorMessage });
        // Push a failed result
        results.push({
          translatedText: request.texts[i],
          sourceLanguage: request.context.sourceLanguage || 'unknown',
          targetLanguage: request.context.targetLanguage,
          wasTranslated: false,
          policyResult: { allowed: false, reason: errorMessage },
        });
      }
    }

    return {
      results,
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Detect language without translation
   */
  async detectLanguage(text: string) {
    return this.detector.detect(text);
  }

  /**
   * Get translation metrics
   */
  getMetrics() {
    return this.metrics.getMetrics();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Validate input text
   */
  private validateInput(text: string): void {
    if (!text || text.trim().length === 0) {
      throw new TranslationError(
        TranslationErrorCode.INVALID_INPUT,
        'Text cannot be empty'
      );
    }

    const maxLength = this.config.maxTextLength || 10000;
    if (text.length > maxLength) {
      throw new TranslationError(
        TranslationErrorCode.TEXT_TOO_LONG,
        `Text exceeds maximum length of ${maxLength} characters`
      );
    }
  }

  /**
   * Determine source language
   */
  private async determineSourceLanguage(
    text: string,
    providedLanguage?: LanguageCode
  ): Promise<LanguageCode> {
    if (providedLanguage) {
      if (!isLanguageSupported(providedLanguage)) {
        throw new TranslationError(
          TranslationErrorCode.LANGUAGE_NOT_SUPPORTED,
          `Source language ${providedLanguage} is not supported`
        );
      }
      return providedLanguage;
    }

    // Auto-detect
    const detection = await this.detector.detect(text);

    if (detection.confidence < 0.6) {
      throw new TranslationError(
        TranslationErrorCode.DETECTION_FAILED,
        'Could not reliably detect source language'
      );
    }

    return detection.language;
  }

  /**
   * Get effective policy for translation
   */
  private getEffectivePolicy(context: TranslationContext): TranslationPolicy {
    if (context.policy) {
      return context.policy;
    }

    if (
      context.metadata?.classificationTags &&
      Array.isArray(context.metadata.classificationTags)
    ) {
      return getPolicyForClassification(context.metadata.classificationTags);
    }

    return DEFAULT_POLICY;
  }

  /**
   * Create translation result
   */
  private createResult(
    translatedText: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    wasTranslated: boolean,
    policyResult: { allowed: boolean; reason?: string }
  ): TranslationResult {
    return {
      translatedText,
      sourceLanguage,
      targetLanguage,
      wasTranslated,
      policyResult,
      provider: this.provider.name,
    };
  }

  /**
   * Generate cache key
   */
  private getCacheKey(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): string {
    // Simple hash-like key (in production, use a proper hash function)
    return `${sourceLanguage}:${targetLanguage}:${text.substring(0, 100)}`;
  }

  /**
   * Audit log translation
   */
  private auditLog(
    context: TranslationContext,
    result: TranslationResult
  ): void {
    // In production, send to audit service
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: context.userId,
      entityId: context.entityId,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      wasTranslated: result.wasTranslated,
      policyAllowed: result.policyResult.allowed,
      provider: result.provider,
    };

    // Log to console for now (replace with proper audit logging)
    console.log('[AUDIT] Translation:', logEntry);
  }

  /**
   * Handle errors
   */
  private handleError(error: any): TranslationError {
    if (error instanceof TranslationError) {
      return error;
    }

    return new TranslationError(
      TranslationErrorCode.TRANSLATION_FAILED,
      error.message || 'Translation failed',
      error
    );
  }
}

/**
 * Singleton instance
 */
let serviceInstance: TranslationService | null = null;

/**
 * Get translation service instance
 */
export async function getTranslationService(
  config?: TranslationServiceConfig
): Promise<TranslationService> {
  if (!serviceInstance && !config) {
    throw new Error('TranslationService not initialized. Provide config first.');
  }

  if (config && !serviceInstance) {
    serviceInstance = new TranslationService(config);
    await serviceInstance.initialize();
  }

  return serviceInstance!;
}
