/**
 * Core NLP types and interfaces
 */

export interface Token {
  text: string;
  start: number;
  end: number;
  pos?: string; // Part of speech
  lemma?: string;
  isStopword?: boolean;
  normalizedForm?: string;
}

export interface Sentence {
  text: string;
  start: number;
  end: number;
  tokens: Token[];
}

export interface Document {
  text: string;
  language?: string;
  sentences: Sentence[];
  metadata?: Record<string, any>;
}

export interface PreprocessingOptions {
  lowercase?: boolean;
  removeStopwords?: boolean;
  removePunctuation?: boolean;
  removeNumbers?: boolean;
  removeUrls?: boolean;
  removeEmails?: boolean;
  removeHtml?: boolean;
  normalizeUnicode?: boolean;
  spellCheck?: boolean;
  lemmatize?: boolean;
  stem?: boolean;
  minTokenLength?: number;
  maxTokenLength?: number;
  customStopwords?: string[];
  customPreprocessors?: Array<(text: string) => string>;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  allLanguages?: Array<{ language: string; confidence: number }>;
}

export interface TokenizationOptions {
  preserveCase?: boolean;
  preserveUrls?: boolean;
  preserveEmails?: boolean;
  preserveMentions?: boolean;
  preserveHashtags?: boolean;
  splitHyphens?: boolean;
  splitPossessives?: boolean;
}

export interface NormalizationOptions {
  unicodeNormalization?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
  caseFolding?: boolean;
  accentRemoval?: boolean;
  numberNormalization?: boolean;
  whitespaceNormalization?: boolean;
}

export interface SpellingOptions {
  autoCorrect?: boolean;
  suggestionsLimit?: number;
  customDictionary?: string[];
  ignoreCase?: boolean;
  ignoreNumbers?: boolean;
}
