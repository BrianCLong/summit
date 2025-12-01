/**
 * Real-Time Translation Service
 *
 * Multi-provider translation with caching, fallback, and streaming support
 * for seamless citizen, immigrant, and international partner access.
 */

import type { TranslationResult } from '../types';

export interface TranslationProvider {
  name: string;
  translate(
    text: string,
    source: string,
    target: string
  ): Promise<TranslationResult>;
  supportedLanguages(): Promise<string[]>;
  isAvailable(): Promise<boolean>;
}

export interface RealTimeTranslationConfig {
  providers: TranslationProvider[];
  cacheEnabled: boolean;
  cacheTTLSeconds: number;
  maxRetries: number;
  fallbackEnabled: boolean;
  qualityThreshold: number;
}

export interface StreamingTranslationOptions {
  chunkSize?: number;
  onChunk?: (chunk: TranslationResult) => void;
  onComplete?: (result: TranslationResult) => void;
  onError?: (error: Error) => void;
}

export interface TranslationContext {
  domain?: 'government' | 'legal' | 'healthcare' | 'education' | 'general';
  formality?: 'formal' | 'informal';
  preserveFormatting?: boolean;
  glossaryId?: string;
}

const SUPPORTED_LANGUAGES = [
  // EU Official Languages
  'en', 'et', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'ro',
  'hu', 'cs', 'sk', 'bg', 'hr', 'sl', 'lt', 'lv', 'fi', 'sv',
  'da', 'el', 'ga', 'mt',
  // International Partners
  'ru', 'uk', 'zh', 'ja', 'ko', 'ar', 'hi', 'vi', 'th', 'tr',
  // Additional Global Languages
  'bn', 'fa', 'he', 'id', 'ms', 'sw', 'ta', 'te', 'ur',
];

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  et: 'Estonian',
  ru: 'Russian',
  uk: 'Ukrainian',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  zh: 'Chinese',
  ar: 'Arabic',
  ja: 'Japanese',
  ko: 'Korean',
  fi: 'Finnish',
  sv: 'Swedish',
  lv: 'Latvian',
  lt: 'Lithuanian',
  pl: 'Polish',
};

export class RealTimeTranslator {
  private config: RealTimeTranslationConfig;
  private cache: Map<string, { result: TranslationResult; expires: number }>;
  private providerHealth: Map<string, { healthy: boolean; lastCheck: number }>;

  constructor(config: Partial<RealTimeTranslationConfig> = {}) {
    this.config = {
      providers: [],
      cacheEnabled: true,
      cacheTTLSeconds: 3600,
      maxRetries: 3,
      fallbackEnabled: true,
      qualityThreshold: 0.7,
      ...config,
    };
    this.cache = new Map();
    this.providerHealth = new Map();
  }

  /**
   * Translate text with automatic language detection
   */
  async translate(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
    context?: TranslationContext
  ): Promise<TranslationResult> {
    if (!text?.trim()) {
      return {
        translatedText: '',
        sourceLanguage: sourceLanguage || 'unknown',
        targetLanguage,
        confidence: 1.0,
      };
    }

    const detectedSource = sourceLanguage || (await this.detectLanguage(text));

    // Same language - return as-is
    if (detectedSource === targetLanguage) {
      return {
        translatedText: text,
        sourceLanguage: detectedSource,
        targetLanguage,
        confidence: 1.0,
      };
    }

    const cacheKey = this.getCacheKey(text, detectedSource, targetLanguage, context);

    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    // Translate with fallback support
    const result = await this.translateWithFallback(
      text,
      detectedSource,
      targetLanguage,
      context
    );

    // Cache result
    if (this.config.cacheEnabled && result.confidence >= this.config.qualityThreshold) {
      this.setCache(cacheKey, result);
    }

    return result;
  }

  /**
   * Batch translation for efficiency
   */
  async translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string,
    context?: TranslationContext
  ): Promise<TranslationResult[]> {
    return Promise.all(
      texts.map((text) => this.translate(text, targetLanguage, sourceLanguage, context))
    );
  }

  /**
   * Streaming translation for real-time applications
   */
  async translateStream(
    text: string,
    targetLanguage: string,
    options: StreamingTranslationOptions = {}
  ): Promise<TranslationResult> {
    const chunkSize = options.chunkSize || 500;
    const chunks = this.splitIntoChunks(text, chunkSize);
    const translatedChunks: string[] = [];

    for (const chunk of chunks) {
      try {
        const result = await this.translate(chunk, targetLanguage);
        translatedChunks.push(result.translatedText);
        options.onChunk?.(result);
      } catch (error) {
        options.onError?.(error as Error);
        throw error;
      }
    }

    const finalResult: TranslationResult = {
      translatedText: translatedChunks.join(' '),
      sourceLanguage: 'auto',
      targetLanguage,
      confidence: 0.85,
    };

    options.onComplete?.(finalResult);
    return finalResult;
  }

  /**
   * Detect language of input text
   */
  async detectLanguage(text: string): Promise<string> {
    if (!text?.trim()) return 'unknown';

    // Simple heuristic-based detection
    const patterns: Record<string, RegExp> = {
      et: /[õäöü]/i,
      ru: /[а-яё]/i,
      uk: /[іїєґ]/i,
      ar: /[\u0600-\u06FF]/,
      zh: /[\u4e00-\u9fff]/,
      ja: /[\u3040-\u309f\u30a0-\u30ff]/,
      ko: /[\uac00-\ud7af]/,
      he: /[\u0590-\u05FF]/,
      th: /[\u0e00-\u0e7f]/,
      el: /[α-ωά-ώ]/i,
      de: /[äöüß]/i,
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) return lang;
    }

    return 'en'; // Default to English
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return SUPPORTED_LANGUAGES.map((code) => ({
      code,
      name: LANGUAGE_NAMES[code] || code.toUpperCase(),
    }));
  }

  /**
   * Check if language pair is supported
   */
  isLanguagePairSupported(source: string, target: string): boolean {
    return (
      SUPPORTED_LANGUAGES.includes(source) && SUPPORTED_LANGUAGES.includes(target)
    );
  }

  /**
   * Get translation for government/official documents
   */
  async translateOfficial(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult & { officialDisclaimer: string }> {
    const result = await this.translate(text, targetLanguage, sourceLanguage, {
      domain: 'government',
      formality: 'formal',
      preserveFormatting: true,
    });

    return {
      ...result,
      officialDisclaimer:
        'This translation is provided for informational purposes. ' +
        'For official documents, please consult certified translation services.',
    };
  }

  // Private methods

  private async translateWithFallback(
    text: string,
    source: string,
    target: string,
    context?: TranslationContext
  ): Promise<TranslationResult> {
    // Use available providers with fallback
    for (const provider of this.config.providers) {
      try {
        if (await this.isProviderHealthy(provider.name)) {
          const result = await provider.translate(text, source, target);
          if (result.confidence >= this.config.qualityThreshold) {
            return result;
          }
        }
      } catch {
        this.markProviderUnhealthy(provider.name);
      }
    }

    // Fallback: Return original with low confidence
    return {
      translatedText: text,
      sourceLanguage: source,
      targetLanguage: target,
      confidence: 0.0,
    };
  }

  private getCacheKey(
    text: string,
    source: string,
    target: string,
    context?: TranslationContext
  ): string {
    const contextKey = context ? JSON.stringify(context) : '';
    return `${source}:${target}:${contextKey}:${text.substring(0, 100)}`;
  }

  private getFromCache(key: string): TranslationResult | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, result: TranslationResult): void {
    this.cache.set(key, {
      result,
      expires: Date.now() + this.config.cacheTTLSeconds * 1000,
    });
  }

  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let current = '';

    for (const sentence of sentences) {
      if ((current + sentence).length > chunkSize && current) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += (current ? ' ' : '') + sentence;
      }
    }

    if (current) chunks.push(current.trim());
    return chunks;
  }

  private async isProviderHealthy(name: string): Promise<boolean> {
    const health = this.providerHealth.get(name);
    if (!health || Date.now() - health.lastCheck > 60000) {
      return true; // Assume healthy if not recently checked
    }
    return health.healthy;
  }

  private markProviderUnhealthy(name: string): void {
    this.providerHealth.set(name, { healthy: false, lastCheck: Date.now() });
  }
}

export const realTimeTranslator = new RealTimeTranslator();
