"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = void 0;
exports.getTranslationService = getTranslationService;
const index_js_1 = require("../types/index.js");
const language_detector_js_1 = require("./language-detector.js");
const translation_provider_js_1 = require("./translation-provider.js");
const translation_policies_js_1 = require("../config/translation-policies.js");
const supported_languages_js_1 = require("../config/supported-languages.js");
const metrics_js_1 = require("./metrics.js");
/**
 * Translation service with policy-aware translation
 */
class TranslationService {
    config;
    provider;
    detector;
    metrics;
    cache;
    constructor(config) {
        this.config = config;
        this.detector = (0, language_detector_js_1.getLanguageDetector)();
        this.metrics = new metrics_js_1.MetricsCollector();
        this.cache = new Map();
    }
    /**
     * Initialize the translation service
     */
    async initialize() {
        this.provider = await translation_provider_js_1.TranslationProviderFactory.createProvider(this.config);
    }
    /**
     * Translate text with policy enforcement
     */
    async translate(text, context) {
        this.metrics.incrementRequests();
        try {
            // Validate input
            this.validateInput(text);
            // Determine source language
            const sourceLanguage = await this.determineSourceLanguage(text, context.sourceLanguage);
            const targetLanguage = context.targetLanguage;
            // Check if translation is needed (same language)
            if (sourceLanguage === targetLanguage) {
                return this.createResult(text, sourceLanguage, targetLanguage, false, { allowed: true });
            }
            // Check cache
            const cacheKey = this.getCacheKey(text, sourceLanguage, targetLanguage);
            if (this.config.enableCache && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                this.metrics.incrementSuccess();
                return cached;
            }
            // Get policy
            const policy = this.getEffectivePolicy(context);
            // Check policy
            const policyCheck = (0, translation_policies_js_1.isTranslationAllowed)(policy, targetLanguage);
            if (!policyCheck.allowed) {
                this.metrics.incrementPolicyViolations();
                return this.createResult(text, sourceLanguage, targetLanguage, false, {
                    allowed: false,
                    reason: policyCheck.reason,
                });
            }
            // Perform translation
            const translatedText = await this.provider.translate(text, sourceLanguage, targetLanguage);
            const result = this.createResult(translatedText, sourceLanguage, targetLanguage, true, { allowed: true });
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
        }
        catch (error) {
            this.metrics.incrementFailures();
            throw this.handleError(error);
        }
    }
    /**
     * Batch translate multiple texts
     */
    async translateBatch(request) {
        const results = [];
        const errors = [];
        for (let i = 0; i < request.texts.length; i++) {
            try {
                const result = await this.translate(request.texts[i], request.context);
                results.push(result);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
    async detectLanguage(text) {
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
    clearCache() {
        this.cache.clear();
    }
    /**
     * Validate input text
     */
    validateInput(text) {
        if (!text || text.trim().length === 0) {
            throw new index_js_1.TranslationError(index_js_1.TranslationErrorCode.INVALID_INPUT, 'Text cannot be empty');
        }
        const maxLength = this.config.maxTextLength || 10000;
        if (text.length > maxLength) {
            throw new index_js_1.TranslationError(index_js_1.TranslationErrorCode.TEXT_TOO_LONG, `Text exceeds maximum length of ${maxLength} characters`);
        }
    }
    /**
     * Determine source language
     */
    async determineSourceLanguage(text, providedLanguage) {
        if (providedLanguage) {
            if (!(0, supported_languages_js_1.isLanguageSupported)(providedLanguage)) {
                throw new index_js_1.TranslationError(index_js_1.TranslationErrorCode.LANGUAGE_NOT_SUPPORTED, `Source language ${providedLanguage} is not supported`);
            }
            return providedLanguage;
        }
        // Auto-detect
        const detection = await this.detector.detect(text);
        if (detection.confidence < 0.6) {
            throw new index_js_1.TranslationError(index_js_1.TranslationErrorCode.DETECTION_FAILED, 'Could not reliably detect source language');
        }
        return detection.language;
    }
    /**
     * Get effective policy for translation
     */
    getEffectivePolicy(context) {
        if (context.policy) {
            return context.policy;
        }
        if (context.metadata?.classificationTags &&
            Array.isArray(context.metadata.classificationTags)) {
            return (0, translation_policies_js_1.getPolicyForClassification)(context.metadata.classificationTags);
        }
        return translation_policies_js_1.DEFAULT_POLICY;
    }
    /**
     * Create translation result
     */
    createResult(translatedText, sourceLanguage, targetLanguage, wasTranslated, policyResult) {
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
    getCacheKey(text, sourceLanguage, targetLanguage) {
        // Simple hash-like key (in production, use a proper hash function)
        return `${sourceLanguage}:${targetLanguage}:${text.substring(0, 100)}`;
    }
    /**
     * Audit log translation
     */
    auditLog(context, result) {
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
    handleError(error) {
        if (error instanceof index_js_1.TranslationError) {
            return error;
        }
        return new index_js_1.TranslationError(index_js_1.TranslationErrorCode.TRANSLATION_FAILED, error.message || 'Translation failed', error);
    }
}
exports.TranslationService = TranslationService;
/**
 * Singleton instance
 */
let serviceInstance = null;
/**
 * Get translation service instance
 */
async function getTranslationService(config) {
    if (!serviceInstance && !config) {
        throw new Error('TranslationService not initialized. Provide config first.');
    }
    if (config && !serviceInstance) {
        serviceInstance = new TranslationService(config);
        await serviceInstance.initialize();
    }
    return serviceInstance;
}
