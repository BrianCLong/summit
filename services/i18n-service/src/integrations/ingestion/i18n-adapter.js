"use strict";
/**
 * Ingestion Pipeline i18n Integration Adapter
 *
 * Provides language detection and optional translation for ingested content.
 * Handles multilingual document processing with policy enforcement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionI18nAdapter = void 0;
exports.getIngestionI18nAdapter = getIngestionI18nAdapter;
const translation_service_js_1 = require("../../lib/translation-service.js");
const language_detector_js_1 = require("../../lib/language-detector.js");
const translation_policies_js_1 = require("../../config/translation-policies.js");
/**
 * Ingestion i18n Adapter
 *
 * Handles language detection and translation for ingested documents.
 */
class IngestionI18nAdapter {
    autoDetectLanguage;
    autoTranslate;
    targetLanguages;
    constructor(options) {
        this.autoDetectLanguage = options?.autoDetectLanguage ?? true;
        this.autoTranslate = options?.autoTranslate ?? false;
        this.targetLanguages = options?.targetLanguages || ['en'];
    }
    /**
     * Detect language of ingested document
     */
    async detectDocumentLanguage(document) {
        const detector = (0, language_detector_js_1.getLanguageDetector)();
        // Use title + content for better detection
        const textToAnalyze = document.title
            ? `${document.title}\n\n${document.content}`
            : document.content;
        const detection = await detector.detect(textToAnalyze);
        return {
            detectedLanguage: detection.language,
            confidence: detection.confidence,
            alternatives: detection.alternatives,
        };
    }
    /**
     * Detect languages for batch of documents
     */
    async detectBatchLanguages(documents) {
        const results = new Map();
        await Promise.all(documents.map(async (doc) => {
            const detection = await this.detectDocumentLanguage(doc);
            results.set(doc.id, detection);
        }));
        return results;
    }
    /**
     * Translate document to target language with policy enforcement
     */
    async translateDocument(document, targetLanguage, sourceLanguage) {
        const translationService = await (0, translation_service_js_1.getTranslationService)();
        // Detect source language if not provided
        let sourceLang = sourceLanguage || document.metadata?.sourceLanguage;
        if (!sourceLang && this.autoDetectLanguage) {
            const detection = await this.detectDocumentLanguage(document);
            sourceLang = detection.detectedLanguage;
        }
        // Get policy from classification tags
        const policy = document.metadata?.classificationTags
            ? (0, translation_policies_js_1.getPolicyForClassification)(document.metadata.classificationTags)
            : undefined;
        const context = {
            sourceLanguage: sourceLang,
            targetLanguage,
            policy,
            entityId: document.id,
            metadata: {
                ...document.metadata,
                purpose: 'ingestion',
                documentType: 'full_text',
            },
        };
        return translationService.translate(document.content, context);
    }
    /**
     * Translate document title separately (for indexing)
     */
    async translateDocumentTitle(title, targetLanguage, sourceLanguage, classificationTags) {
        const translationService = await (0, translation_service_js_1.getTranslationService)();
        const policy = classificationTags
            ? (0, translation_policies_js_1.getPolicyForClassification)(classificationTags)
            : undefined;
        const context = {
            sourceLanguage,
            targetLanguage,
            policy,
            metadata: {
                classificationTags,
                purpose: 'ingestion',
                documentType: 'title',
            },
        };
        return translationService.translate(title, context);
    }
    /**
     * Process document with detection and optional translation
     *
     * Returns document with detected language and optional translations
     */
    async processDocument(document) {
        // Detect language
        const detection = await this.detectDocumentLanguage(document);
        const translations = new Map();
        // Add original language
        translations.set(detection.detectedLanguage, {
            content: document.content,
            title: document.title,
            wasTranslated: false,
            policyAllowed: true,
        });
        // Translate to target languages if enabled
        if (this.autoTranslate) {
            for (const targetLang of this.targetLanguages) {
                if (targetLang === detection.detectedLanguage)
                    continue;
                try {
                    // Translate content
                    const contentResult = await this.translateDocument(document, targetLang, detection.detectedLanguage);
                    // Translate title if present
                    let titleResult;
                    if (document.title) {
                        titleResult = await this.translateDocumentTitle(document.title, targetLang, detection.detectedLanguage, document.metadata?.classificationTags);
                    }
                    translations.set(targetLang, {
                        content: contentResult.translatedText,
                        title: titleResult?.translatedText,
                        wasTranslated: contentResult.wasTranslated,
                        policyAllowed: contentResult.policyResult.allowed,
                    });
                }
                catch (error) {
                    console.error(`Failed to translate document ${document.id} to ${targetLang}:`, error);
                    // Continue with other languages
                }
            }
        }
        return {
            originalDocument: document,
            detectedLanguage: detection.detectedLanguage,
            translations,
            metadata: {
                confidence: detection.confidence,
                processingTimestamp: new Date().toISOString(),
            },
        };
    }
    /**
     * Process batch of documents
     */
    async processBatch(documents) {
        return Promise.all(documents.map((doc) => this.processDocument(doc)));
    }
    /**
     * Create search index entries for multilingual search
     *
     * Returns content in multiple languages for search indexing
     */
    async createMultilingualSearchIndex(document) {
        const processed = await this.processDocument(document);
        const searchIndex = new Map();
        for (const [lang, translation] of processed.translations) {
            if (translation.policyAllowed) {
                // Combine title and content for search
                const searchText = translation.title
                    ? `${translation.title}\n${translation.content}`
                    : translation.content;
                searchIndex.set(lang, searchText);
            }
        }
        return searchIndex;
    }
    /**
     * Extract multilingual metadata for document
     *
     * Useful for faceted search and filtering
     */
    async extractMultilingualMetadata(document) {
        const processed = await this.processDocument(document);
        const translationStatus = new Map();
        for (const [lang, translation] of processed.translations) {
            if (translation.policyAllowed && translation.content) {
                translationStatus.set(lang, 'available');
            }
            else if (!translation.policyAllowed) {
                translationStatus.set(lang, 'policy_blocked');
            }
            else {
                translationStatus.set(lang, 'failed');
            }
        }
        return {
            detectedLanguage: processed.detectedLanguage,
            availableLanguages: Array.from(processed.translations.keys()),
            confidence: processed.metadata.confidence,
            translationStatus,
        };
    }
    /**
     * Update configuration
     */
    updateConfig(options) {
        if (options.autoDetectLanguage !== undefined) {
            this.autoDetectLanguage = options.autoDetectLanguage;
        }
        if (options.autoTranslate !== undefined) {
            this.autoTranslate = options.autoTranslate;
        }
        if (options.targetLanguages !== undefined) {
            this.targetLanguages = options.targetLanguages;
        }
    }
}
exports.IngestionI18nAdapter = IngestionI18nAdapter;
/**
 * Singleton instance
 */
let adapterInstance = null;
/**
 * Get Ingestion i18n adapter instance
 */
function getIngestionI18nAdapter(options) {
    if (!adapterInstance) {
        adapterInstance = new IngestionI18nAdapter(options);
    }
    else if (options) {
        adapterInstance.updateConfig(options);
    }
    return adapterInstance;
}
