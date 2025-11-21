/**
 * Language model types
 */

export interface Embedding {
  vector: number[];
  dimension: number;
  model: string;
}

export interface QuestionAnswerResult {
  answer: string;
  confidence: number;
  context: string;
  startPosition: number;
  endPosition: number;
}

export interface SummaryResult {
  summary: string;
  type: 'extractive' | 'abstractive';
  compressionRatio: number;
  keyPoints?: string[];
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export interface SemanticSearchResult {
  documentId: string;
  score: number;
  text: string;
  highlights?: string[];
}

export interface GenerationResult {
  text: string;
  tokens: number;
  finishReason: 'completed' | 'max_length' | 'stop_sequence';
}
