/**
 * Types for query understanding and NLP
 */

export interface QueryIntent {
  intent: string;
  confidence: number;
  entities?: ExtractedEntity[];
  metadata?: Record<string, any>;
}

export interface ExtractedEntity {
  text: string;
  type: string;
  start: number;
  end: number;
  confidence?: number;
  normalized?: string;
  metadata?: Record<string, any>;
}

export interface ExpandedQuery {
  original: string;
  expanded: string[];
  synonyms: Map<string, string[]>;
  related: string[];
  method: 'wordnet' | 'embedding' | 'llm' | 'hybrid';
}

export interface SpellCorrection {
  original: string;
  corrected: string;
  corrections: Array<{
    word: string;
    suggestions: string[];
    confidence: number;
  }>;
  hasErrors: boolean;
}

export interface QueryAnalysis {
  tokens: string[];
  lemmas: string[];
  stems: string[];
  pos: Array<{ token: string; tag: string }>;
  entities: ExtractedEntity[];
  sentiment: {
    score: number;
    comparative: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  language: string;
  intent?: QueryIntent;
}

export interface QueryReformulation {
  original: string;
  reformulated: string[];
  method: 'paraphrase' | 'simplify' | 'expand' | 'clarify';
  confidence: number;
}

export interface EntityType {
  name: string;
  patterns: RegExp[];
  validator?: (text: string) => boolean;
  normalizer?: (text: string) => string;
}

export interface IntentClassifierConfig {
  model?: 'naive_bayes' | 'logistic_regression' | 'neural' | 'llm';
  threshold?: number;
  multiLabel?: boolean;
  customIntents?: Intent[];
}

export interface Intent {
  name: string;
  description: string;
  examples: string[];
  patterns?: RegExp[];
}

export interface QuerySuggestion {
  text: string;
  score: number;
  reason: 'spelling' | 'completion' | 'related' | 'popular';
}
