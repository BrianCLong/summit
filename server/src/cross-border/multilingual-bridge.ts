/**
 * Multilingual Bridge for Cross-Border Communication
 *
 * Provides real-time translation and language detection for
 * seamless cross-border assistant interoperability.
 */

import { EventEmitter } from 'events';
import type { CrossBorderMessage, ContextEntity } from './types.js';

/**
 * Supported language pairs for direct translation
 */
export interface LanguagePair {
  source: string;
  target: string;
  quality: 'high' | 'medium' | 'low';
  provider: string;
}

/**
 * Translation request
 */
export interface TranslationRequest {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
  context?: string;
  domain?: string;
  preserveFormatting?: boolean;
}

/**
 * Translation result
 */
export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  provider: string;
  processingTimeMs: number;
  alternatives?: string[];
}

/**
 * Language detection result
 */
export interface LanguageDetection {
  language: string;
  confidence: number;
  alternatives: Array<{ language: string; confidence: number }>;
}

/**
 * EU official languages
 */
const EU_LANGUAGES = [
  'bg', 'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'fi', 'fr',
  'ga', 'hr', 'hu', 'it', 'lt', 'lv', 'mt', 'nl', 'pl', 'pt',
  'ro', 'sk', 'sl', 'sv',
];

/**
 * Baltic and Nordic languages commonly used in Bürokratt network
 */
const BUROKRATT_LANGUAGES = ['et', 'fi', 'lv', 'lt', 'sv', 'en', 'ru'];

/**
 * Multilingual Bridge Service
 *
 * Handles translation and language processing for cross-border
 * assistant communication.
 */
export class MultilingualBridge extends EventEmitter {
  private translationCache: Map<string, TranslationResult> = new Map();
  private supportedPairs: LanguagePair[] = [];
  private defaultProvider = 'internal';

  constructor() {
    super();
    this.initializeSupportedPairs();
  }

  /**
   * Initialize supported language pairs
   */
  private initializeSupportedPairs(): void {
    // High-quality pairs (Estonian ecosystem focus)
    const highQualityPairs: Array<[string, string]> = [
      ['et', 'en'], ['en', 'et'],
      ['fi', 'en'], ['en', 'fi'],
      ['lv', 'en'], ['en', 'lv'],
      ['lt', 'en'], ['en', 'lt'],
      ['et', 'fi'], ['fi', 'et'],
      ['et', 'ru'], ['ru', 'et'],
      ['de', 'en'], ['en', 'de'],
      ['fr', 'en'], ['en', 'fr'],
    ];

    for (const [source, target] of highQualityPairs) {
      this.supportedPairs.push({
        source,
        target,
        quality: 'high',
        provider: 'neural-mt',
      });
    }

    // Medium quality - via English pivot
    for (const lang of EU_LANGUAGES) {
      if (lang !== 'en') {
        const hasDirectPair = this.supportedPairs.some(
          (p) => p.source === lang && p.target === 'en'
        );
        if (!hasDirectPair) {
          this.supportedPairs.push({
            source: lang,
            target: 'en',
            quality: 'medium',
            provider: 'pivot-mt',
          });
          this.supportedPairs.push({
            source: 'en',
            target: lang,
            quality: 'medium',
            provider: 'pivot-mt',
          });
        }
      }
    }
  }

  /**
   * Translate text between languages
   */
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const startTime = Date.now();

    // Detect source language if not provided
    const sourceLanguage = request.sourceLanguage ||
      (await this.detectLanguage(request.text)).language;

    // Check cache
    const cacheKey = this.getCacheKey(request.text, sourceLanguage, request.targetLanguage);
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      return { ...cached, processingTimeMs: Date.now() - startTime };
    }

    // Find translation path
    const path = this.findTranslationPath(sourceLanguage, request.targetLanguage);
    if (path.length === 0) {
      throw new Error(
        `No translation path from ${sourceLanguage} to ${request.targetLanguage}`
      );
    }

    // Perform translation (potentially multi-hop)
    let currentText = request.text;
    let totalConfidence = 1.0;

    for (let i = 0; i < path.length - 1; i++) {
      const pair = this.supportedPairs.find(
        (p) => p.source === path[i] && p.target === path[i + 1]
      );
      if (!pair) continue;

      const stepResult = await this.translateStep(
        currentText,
        path[i],
        path[i + 1],
        request.domain
      );
      currentText = stepResult.text;
      totalConfidence *= stepResult.confidence;
    }

    const result: TranslationResult = {
      originalText: request.text,
      translatedText: currentText,
      sourceLanguage,
      targetLanguage: request.targetLanguage,
      confidence: totalConfidence,
      provider: path.length > 2 ? 'pivot-mt' : 'neural-mt',
      processingTimeMs: Date.now() - startTime,
    };

    // Cache result
    this.translationCache.set(cacheKey, result);
    this.emit('translationComplete', result);

    return result;
  }

  /**
   * Translate a cross-border message
   */
  async translateMessage(
    message: CrossBorderMessage,
    targetLanguage: string
  ): Promise<CrossBorderMessage> {
    if (message.language === targetLanguage) {
      return message;
    }

    const translation = await this.translate({
      text: message.content,
      sourceLanguage: message.language,
      targetLanguage,
    });

    return {
      ...message,
      translations: {
        ...message.translations,
        [targetLanguage]: translation.translatedText,
      },
    };
  }

  /**
   * Translate context entities
   */
  async translateEntities(
    entities: ContextEntity[],
    targetLanguage: string,
    sourceLanguage: string
  ): Promise<ContextEntity[]> {
    const translated: ContextEntity[] = [];

    for (const entity of entities) {
      if (entity.redacted) {
        translated.push(entity);
        continue;
      }

      // Only translate certain entity types
      const translatableTypes = ['description', 'note', 'summary', 'title'];
      if (translatableTypes.includes(entity.type.toLowerCase())) {
        const result = await this.translate({
          text: entity.value,
          sourceLanguage,
          targetLanguage,
        });
        translated.push({
          ...entity,
          value: result.translatedText,
          confidence: entity.confidence * result.confidence,
        });
      } else {
        translated.push(entity);
      }
    }

    return translated;
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<LanguageDetection> {
    // Simple n-gram based detection for common languages
    const scores = new Map<string, number>();

    // Character patterns for Baltic/Nordic languages
    const patterns: Record<string, RegExp[]> = {
      et: [/õ/gi, /ä/gi, /ö/gi, /ü/gi, /[^aeiou]te\b/gi],
      fi: [/ää/gi, /öö/gi, /yy/gi, /\bja\b/gi, /\bon\b/gi],
      lv: [/ā/gi, /ē/gi, /ī/gi, /ū/gi, /ķ/gi, /ļ/gi],
      lt: [/ą/gi, /ę/gi, /ė/gi, /į/gi, /ų/gi, /ū/gi],
      ru: [/[а-яА-Я]/g],
      de: [/ß/gi, /\bund\b/gi, /\bdie\b/gi, /\bder\b/gi],
      en: [/\bthe\b/gi, /\band\b/gi, /\bof\b/gi, /\bto\b/gi],
      sv: [/å/gi, /\boch\b/gi, /\batt\b/gi],
    };

    for (const [lang, regexes] of Object.entries(patterns)) {
      let score = 0;
      for (const regex of regexes) {
        const matches = text.match(regex);
        score += matches ? matches.length : 0;
      }
      scores.set(lang, score);
    }

    // Sort by score
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([, score]) => score > 0);

    if (sorted.length === 0) {
      return {
        language: 'en',
        confidence: 0.5,
        alternatives: [],
      };
    }

    const totalScore = sorted.reduce((sum, [, score]) => sum + score, 0);
    const topScore = sorted[0][1];

    return {
      language: sorted[0][0],
      confidence: Math.min(0.95, topScore / Math.max(totalScore, 1)),
      alternatives: sorted.slice(1, 4).map(([language, score]) => ({
        language,
        confidence: score / Math.max(totalScore, 1),
      })),
    };
  }

  /**
   * Check if translation is supported
   */
  isTranslationSupported(source: string, target: string): boolean {
    return this.findTranslationPath(source, target).length > 0;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    const languages = new Set<string>();
    for (const pair of this.supportedPairs) {
      languages.add(pair.source);
      languages.add(pair.target);
    }
    return Array.from(languages).sort();
  }

  /**
   * Get Bürokratt network languages
   */
  getBurokrattLanguages(): string[] {
    return [...BUROKRATT_LANGUAGES];
  }

  /**
   * Find translation path between languages
   */
  private findTranslationPath(source: string, target: string): string[] {
    if (source === target) return [source];

    // Direct translation
    const direct = this.supportedPairs.find(
      (p) => p.source === source && p.target === target
    );
    if (direct) return [source, target];

    // Via English pivot
    const toEnglish = this.supportedPairs.find(
      (p) => p.source === source && p.target === 'en'
    );
    const fromEnglish = this.supportedPairs.find(
      (p) => p.source === 'en' && p.target === target
    );
    if (toEnglish && fromEnglish) {
      return [source, 'en', target];
    }

    return [];
  }

  /**
   * Perform a single translation step
   */
  private async translateStep(
    text: string,
    source: string,
    target: string,
    domain?: string
  ): Promise<{ text: string; confidence: number }> {
    // In production, this would call actual translation API
    // For now, return placeholder indicating translation needed
    this.emit('translateStep', { text, source, target, domain });

    // Simulated translation (in production, use actual MT service)
    return {
      text: `[${target.toUpperCase()}] ${text}`,
      confidence: 0.9,
    };
  }

  /**
   * Generate cache key for translation
   */
  private getCacheKey(text: string, source: string, target: string): string {
    return `${source}:${target}:${text.slice(0, 100)}`;
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.translationCache.clear();
  }
}

// Singleton
let bridgeInstance: MultilingualBridge | null = null;

export function getMultilingualBridge(): MultilingualBridge {
  if (!bridgeInstance) {
    bridgeInstance = new MultilingualBridge();
  }
  return bridgeInstance;
}
