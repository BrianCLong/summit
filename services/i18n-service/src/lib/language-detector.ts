import { franc } from 'franc';
import ISO6391 from 'iso-639-1';
import type {
  LanguageCode,
  LanguageDetectionResult,
  LanguageDetectionConfig,
} from '../types/index.js';
import { isLanguageSupported } from '../config/supported-languages.js';

/**
 * Language detection service using franc library
 */
export class LanguageDetector {
  private config: LanguageDetectionConfig;

  constructor(config: LanguageDetectionConfig = {}) {
    this.config = {
      minConfidence: config.minConfidence || 0.6,
      defaultLanguage: config.defaultLanguage || 'en',
      minTextLength: config.minTextLength || 10,
      returnAlternatives: config.returnAlternatives ?? true,
    };
  }

  /**
   * Detect language from text
   */
  async detect(text: string): Promise<LanguageDetectionResult> {
    // Validate input
    if (!text || text.trim().length === 0) {
      return this.createFallbackResult();
    }

    // Check minimum length
    if (text.trim().length < this.config.minTextLength!) {
      return this.createFallbackResult();
    }

    try {
      // Detect using franc (returns ISO 639-3 code)
      const detected = franc(text, {
        minLength: this.config.minTextLength,
        only: this.getSupportedLanguages(),
      });

      // Handle unknown language
      if (detected === 'und') {
        return this.createFallbackResult();
      }

      // Convert ISO 639-3 to ISO 639-1
      const language = this.convertToISO6391(detected);

      if (!language) {
        return this.createFallbackResult();
      }

      // Calculate confidence (franc doesn't provide confidence, so we estimate)
      const confidence = this.estimateConfidence(text, language);

      // Check confidence threshold
      if (confidence < this.config.minConfidence!) {
        return this.createFallbackResult();
      }

      // Get alternatives if requested
      const alternatives = this.config.returnAlternatives
        ? await this.getAlternatives(text, language)
        : undefined;

      return {
        language,
        confidence,
        alternatives,
      };
    } catch (error) {
      console.error('Language detection error:', error);
      return this.createFallbackResult();
    }
  }

  /**
   * Batch detect languages from multiple texts
   */
  async detectBatch(texts: string[]): Promise<LanguageDetectionResult[]> {
    return Promise.all(texts.map((text) => this.detect(text)));
  }

  /**
   * Create fallback result using default language
   */
  private createFallbackResult(): LanguageDetectionResult {
    return {
      language: this.config.defaultLanguage!,
      confidence: 0.5,
      alternatives: [],
    };
  }

  /**
   * Get supported languages in ISO 639-3 format for franc
   */
  private getSupportedLanguages(): string[] {
    // franc uses ISO 639-3 codes
    // We'll let it detect all languages and filter later
    return [];
  }

  /**
   * Convert ISO 639-3 code to ISO 639-1
   */
  private convertToISO6391(iso639_3: string): LanguageCode | null {
    try {
      // franc returns ISO 639-3, we need ISO 639-1
      // Common mappings
      const mappings: Record<string, string> = {
        eng: 'en',
        fra: 'fr',
        deu: 'de',
        spa: 'es',
        ita: 'it',
        por: 'pt',
        nld: 'nl',
        dan: 'da',
        nor: 'no',
        swe: 'sv',
        fin: 'fi',
        isl: 'is',
        pol: 'pl',
        ces: 'cs',
        slk: 'sk',
        hun: 'hu',
        ron: 'ro',
        bul: 'bg',
        hrv: 'hr',
        slv: 'sl',
        est: 'et',
        lav: 'lv',
        lit: 'lt',
        mlt: 'mt',
        tur: 'tr',
        ell: 'el',
        mkd: 'mk',
        sqi: 'sq',
        srp: 'sr',
        ara: 'ar',
        heb: 'he',
        fas: 'fa',
        urd: 'ur',
        zho: 'zh',
        jpn: 'ja',
        kor: 'ko',
        vie: 'vi',
        tha: 'th',
        ind: 'id',
        msa: 'ms',
        hin: 'hi',
        ben: 'bn',
        tam: 'ta',
        tel: 'te',
        rus: 'ru',
        ukr: 'uk',
        bel: 'be',
        kat: 'ka',
        hye: 'hy',
        aze: 'az',
        kaz: 'kk',
        uzb: 'uz',
      };

      const iso6391 = mappings[iso639_3];
      if (iso6391 && isLanguageSupported(iso6391)) {
        return iso6391;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Estimate confidence score
   */
  private estimateConfidence(text: string, language: LanguageCode): number {
    // Simple heuristic based on text length
    // Longer text = more confident
    const length = text.trim().length;

    if (length < 20) return 0.6;
    if (length < 50) return 0.7;
    if (length < 100) return 0.8;
    if (length < 500) return 0.9;
    return 0.95;
  }

  /**
   * Get alternative language detections
   */
  private async getAlternatives(
    text: string,
    primaryLanguage: LanguageCode
  ): Promise<Array<{ language: LanguageCode; confidence: number }>> {
    // For now, return empty alternatives
    // In a real implementation, we could use franc.all() to get all possibilities
    return [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LanguageDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Singleton instance
 */
let detectorInstance: LanguageDetector | null = null;

/**
 * Get language detector instance
 */
export function getLanguageDetector(
  config?: LanguageDetectionConfig
): LanguageDetector {
  if (!detectorInstance) {
    detectorInstance = new LanguageDetector(config);
  } else if (config) {
    detectorInstance.updateConfig(config);
  }
  return detectorInstance;
}

/**
 * Quick detect helper
 */
export async function detectLanguage(
  text: string,
  config?: LanguageDetectionConfig
): Promise<LanguageDetectionResult> {
  const detector = getLanguageDetector(config);
  return detector.detect(text);
}
