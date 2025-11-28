/**
 * Ingestion Pipeline i18n Integration Adapter
 *
 * Provides language detection and optional translation for ingested content.
 * Handles multilingual document processing with policy enforcement.
 */

import type {
  LanguageCode,
  TranslationContext,
  TranslationResult,
  BatchTranslationRequest,
  BatchTranslationResult,
} from '../../types/index.js';
import { getTranslationService } from '../../lib/translation-service.js';
import { getLanguageDetector } from '../../lib/language-detector.js';
import { getPolicyForClassification } from '../../config/translation-policies.js';

export interface IngestedDocument {
  id: string;
  content: string;
  title?: string;
  metadata?: {
    classificationTags?: string[];
    sourceLanguage?: LanguageCode;
    [key: string]: any;
  };
}

export interface LanguageDetectionMetadata {
  detectedLanguage: LanguageCode;
  confidence: number;
  alternatives?: Array<{ language: LanguageCode; confidence: number }>;
}

export interface TranslatedDocument {
  originalDocument: IngestedDocument;
  detectedLanguage: LanguageCode;
  translations: Map<LanguageCode, {
    content: string;
    title?: string;
    wasTranslated: boolean;
    policyAllowed: boolean;
  }>;
  metadata: {
    confidence: number;
    processingTimestamp: string;
  };
}

/**
 * Ingestion i18n Adapter
 *
 * Handles language detection and translation for ingested documents.
 */
export class IngestionI18nAdapter {
  private autoDetectLanguage: boolean;
  private autoTranslate: boolean;
  private targetLanguages: LanguageCode[];

  constructor(options?: {
    autoDetectLanguage?: boolean;
    autoTranslate?: boolean;
    targetLanguages?: LanguageCode[];
  }) {
    this.autoDetectLanguage = options?.autoDetectLanguage ?? true;
    this.autoTranslate = options?.autoTranslate ?? false;
    this.targetLanguages = options?.targetLanguages || ['en'];
  }

  /**
   * Detect language of ingested document
   */
  async detectDocumentLanguage(
    document: IngestedDocument
  ): Promise<LanguageDetectionMetadata> {
    const detector = getLanguageDetector();

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
  async detectBatchLanguages(
    documents: IngestedDocument[]
  ): Promise<Map<string, LanguageDetectionMetadata>> {
    const results = new Map<string, LanguageDetectionMetadata>();

    await Promise.all(
      documents.map(async (doc) => {
        const detection = await this.detectDocumentLanguage(doc);
        results.set(doc.id, detection);
      })
    );

    return results;
  }

  /**
   * Translate document to target language with policy enforcement
   */
  async translateDocument(
    document: IngestedDocument,
    targetLanguage: LanguageCode,
    sourceLanguage?: LanguageCode
  ): Promise<TranslationResult> {
    const translationService = await getTranslationService();

    // Detect source language if not provided
    let sourceLang = sourceLanguage || document.metadata?.sourceLanguage;
    if (!sourceLang && this.autoDetectLanguage) {
      const detection = await this.detectDocumentLanguage(document);
      sourceLang = detection.detectedLanguage;
    }

    // Get policy from classification tags
    const policy = document.metadata?.classificationTags
      ? getPolicyForClassification(document.metadata.classificationTags)
      : undefined;

    const context: TranslationContext = {
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
  async translateDocumentTitle(
    title: string,
    targetLanguage: LanguageCode,
    sourceLanguage?: LanguageCode,
    classificationTags?: string[]
  ): Promise<TranslationResult> {
    const translationService = await getTranslationService();

    const policy = classificationTags
      ? getPolicyForClassification(classificationTags)
      : undefined;

    const context: TranslationContext = {
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
  async processDocument(
    document: IngestedDocument
  ): Promise<TranslatedDocument> {
    // Detect language
    const detection = await this.detectDocumentLanguage(document);

    const translations = new Map<LanguageCode, {
      content: string;
      title?: string;
      wasTranslated: boolean;
      policyAllowed: boolean;
    }>();

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
        if (targetLang === detection.detectedLanguage) continue;

        try {
          // Translate content
          const contentResult = await this.translateDocument(
            document,
            targetLang,
            detection.detectedLanguage
          );

          // Translate title if present
          let titleResult: TranslationResult | undefined;
          if (document.title) {
            titleResult = await this.translateDocumentTitle(
              document.title,
              targetLang,
              detection.detectedLanguage,
              document.metadata?.classificationTags
            );
          }

          translations.set(targetLang, {
            content: contentResult.translatedText,
            title: titleResult?.translatedText,
            wasTranslated: contentResult.wasTranslated,
            policyAllowed: contentResult.policyResult.allowed,
          });
        } catch (error) {
          console.error(
            `Failed to translate document ${document.id} to ${targetLang}:`,
            error
          );
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
  async processBatch(
    documents: IngestedDocument[]
  ): Promise<TranslatedDocument[]> {
    return Promise.all(documents.map((doc) => this.processDocument(doc)));
  }

  /**
   * Create search index entries for multilingual search
   *
   * Returns content in multiple languages for search indexing
   */
  async createMultilingualSearchIndex(
    document: IngestedDocument
  ): Promise<Map<LanguageCode, string>> {
    const processed = await this.processDocument(document);
    const searchIndex = new Map<LanguageCode, string>();

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
  async extractMultilingualMetadata(
    document: IngestedDocument
  ): Promise<{
    detectedLanguage: LanguageCode;
    availableLanguages: LanguageCode[];
    confidence: number;
    translationStatus: Map<LanguageCode, 'available' | 'policy_blocked' | 'failed'>;
  }> {
    const processed = await this.processDocument(document);

    const translationStatus = new Map<LanguageCode, 'available' | 'policy_blocked' | 'failed'>();

    for (const [lang, translation] of processed.translations) {
      if (translation.policyAllowed && translation.content) {
        translationStatus.set(lang, 'available');
      } else if (!translation.policyAllowed) {
        translationStatus.set(lang, 'policy_blocked');
      } else {
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
  updateConfig(options: {
    autoDetectLanguage?: boolean;
    autoTranslate?: boolean;
    targetLanguages?: LanguageCode[];
  }): void {
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

/**
 * Singleton instance
 */
let adapterInstance: IngestionI18nAdapter | null = null;

/**
 * Get Ingestion i18n adapter instance
 */
export function getIngestionI18nAdapter(options?: {
  autoDetectLanguage?: boolean;
  autoTranslate?: boolean;
  targetLanguages?: LanguageCode[];
}): IngestionI18nAdapter {
  if (!adapterInstance) {
    adapterInstance = new IngestionI18nAdapter(options);
  } else if (options) {
    adapterInstance.updateConfig(options);
  }
  return adapterInstance;
}
