// server/src/babel/babel.types.ts

/**
 * Represents a translation request.
 */
export interface TranslationRequest {
  requestId: string;
  sourceLanguage: string;
  targetLanguage: string;
  text: string;
}

/**
 * Represents a translation result.
 */
export interface TranslationResult {
  translationId: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  translatedText: string;
}
