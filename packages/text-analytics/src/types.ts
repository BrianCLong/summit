/**
 * Text analytics types
 */

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  aspects?: AspectSentiment[];
  emotions?: EmotionScore[];
}

export interface AspectSentiment {
  aspect: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  mentions: Array<{ text: string; start: number; end: number }>;
}

export interface EmotionScore {
  emotion: 'joy' | 'anger' | 'fear' | 'sadness' | 'surprise' | 'disgust';
  score: number;
  confidence: number;
}

export interface Topic {
  id: string;
  label?: string;
  keywords: Array<{ word: string; weight: number }>;
  documents: number[];
  coherence: number;
}

export interface TopicAssignment {
  documentId: number;
  topics: Array<{ topicId: string; probability: number }>;
}

export interface DocumentCluster {
  id: string;
  centroid: number[];
  documents: Array<{ id: number; distance: number }>;
  label?: string;
  size: number;
}

export interface ClassificationResult {
  label: string;
  confidence: number;
  allLabels?: Array<{ label: string; confidence: number }>;
  explanation?: string;
}

export interface SimilarityResult {
  document1Id: string;
  document2Id: string;
  similarity: number;
  method: 'cosine' | 'jaccard' | 'levenshtein' | 'semantic';
}

export interface Relationship {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  start: number;
  end: number;
  sentenceIndex: number;
}

export interface KeyPhrase {
  text: string;
  score: number;
  start: number;
  end: number;
  frequency: number;
}

export interface EventExtraction {
  event: string;
  eventType: string;
  participants: Array<{ role: string; entity: string }>;
  time?: string;
  location?: string;
  confidence: number;
}

export interface TemporalRelation {
  event1: string;
  event2: string;
  relation: 'before' | 'after' | 'during' | 'overlaps' | 'simultaneous';
  confidence: number;
}
