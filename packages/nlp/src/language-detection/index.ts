/**
 * Language detection for 100+ languages
 */

import type { LanguageDetectionResult } from '../types';

export class LanguageDetector {
  private cache: Map<string, LanguageDetectionResult> = new Map();

  /**
   * Detect language from text
   */
  detect(text: string, options: { detailed?: boolean } = {}): LanguageDetectionResult {
    // Check cache
    const cacheKey = `${text.substring(0, 100)}:${options.detailed}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const result = this.detectLanguage(text, options.detailed);

    // Cache result
    if (this.cache.size < 1000) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Detect language with confidence scores
   */
  detectWithConfidence(text: string): LanguageDetectionResult {
    return this.detect(text, { detailed: true });
  }

  /**
   * Detect multiple languages in mixed text
   */
  detectMultiple(text: string): LanguageDetectionResult[] {
    // Split text into segments and detect language for each
    const segments = this.segmentText(text);
    return segments.map((segment) => this.detect(segment));
  }

  /**
   * Check if text is in a specific language
   */
  isLanguage(text: string, language: string, threshold: number = 0.8): boolean {
    const result = this.detect(text);
    return result.language === language && result.confidence >= threshold;
  }

  /**
   * Internal language detection implementation
   */
  private detectLanguage(text: string, detailed?: boolean): LanguageDetectionResult {
    // Simplified language detection based on character sets
    // In production, use a library like 'franc' or a transformer model

    const charStats = this.analyzeCharacters(text);

    let language = 'en'; // Default to English
    let confidence = 0.5;

    // Detect based on character patterns
    if (charStats.cyrillic > 0.5) {
      language = 'ru';
      confidence = charStats.cyrillic;
    } else if (charStats.chinese > 0.5) {
      language = 'zh';
      confidence = charStats.chinese;
    } else if (charStats.arabic > 0.5) {
      language = 'ar';
      confidence = charStats.arabic;
    } else if (charStats.japanese > 0.3) {
      language = 'ja';
      confidence = charStats.japanese;
    } else if (charStats.korean > 0.3) {
      language = 'ko';
      confidence = charStats.korean;
    } else {
      // Default to English with moderate confidence
      language = 'en';
      confidence = 0.7;
    }

    const result: LanguageDetectionResult = {
      language,
      confidence,
    };

    if (detailed) {
      result.allLanguages = [
        { language: 'en', confidence: 1 - charStats.nonLatin },
        { language: 'ru', confidence: charStats.cyrillic },
        { language: 'zh', confidence: charStats.chinese },
        { language: 'ar', confidence: charStats.arabic },
        { language: 'ja', confidence: charStats.japanese },
        { language: 'ko', confidence: charStats.korean },
      ]
        .filter((l) => l.confidence > 0.1)
        .sort((a, b) => b.confidence - a.confidence);
    }

    return result;
  }

  /**
   * Analyze character distribution
   */
  private analyzeCharacters(text: string): {
    cyrillic: number;
    chinese: number;
    arabic: number;
    japanese: number;
    korean: number;
    nonLatin: number;
  } {
    let cyrillicCount = 0;
    let chineseCount = 0;
    let arabicCount = 0;
    let japaneseCount = 0;
    let koreanCount = 0;
    let nonLatinCount = 0;

    const totalChars = text.replace(/\s/g, '').length;

    for (const char of text) {
      const code = char.charCodeAt(0);

      if (code >= 0x0400 && code <= 0x04ff) {
        cyrillicCount++;
        nonLatinCount++;
      } else if (code >= 0x4e00 && code <= 0x9fff) {
        chineseCount++;
        nonLatinCount++;
      } else if (code >= 0x0600 && code <= 0x06ff) {
        arabicCount++;
        nonLatinCount++;
      } else if (code >= 0x3040 && code <= 0x309f) {
        japaneseCount++;
        nonLatinCount++;
      } else if (code >= 0xac00 && code <= 0xd7af) {
        koreanCount++;
        nonLatinCount++;
      }
    }

    return {
      cyrillic: cyrillicCount / totalChars,
      chinese: chineseCount / totalChars,
      arabic: arabicCount / totalChars,
      japanese: japaneseCount / totalChars,
      korean: koreanCount / totalChars,
      nonLatin: nonLatinCount / totalChars,
    };
  }

  /**
   * Segment text for multi-language detection
   */
  private segmentText(text: string): string[] {
    // Simple segmentation by sentences
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  }

  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Supported language codes (ISO 639-1)
 */
export const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
  'ar', 'hi', 'bn', 'pa', 'te', 'mr', 'ta', 'ur', 'gu', 'kn',
  'ml', 'or', 'as', 'ne', 'si', 'th', 'vi', 'id', 'ms', 'tl',
  'nl', 'pl', 'uk', 'ro', 'cs', 'sv', 'hu', 'el', 'he', 'fa',
  'tr', 'fi', 'da', 'no', 'sk', 'bg', 'hr', 'sr', 'sl', 'et',
  'lv', 'lt', 'sq', 'mk', 'bs', 'cy', 'ga', 'is', 'mt', 'lb',
  // Add more language codes as needed
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
