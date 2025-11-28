/**
 * Provider Interface Types
 *
 * Defines pluggable provider interfaces for:
 * - Speech-to-Text (STT)
 * - Speaker Diarization
 * - Language Detection
 * - Translation
 * - Content Analysis
 */

import { z } from 'zod';
import type {
  Utterance,
  ParticipantRef,
  WordTiming,
  MediaAsset,
} from './media.js';

// ============================================================================
// Base Provider Types
// ============================================================================

export const ProviderType = z.enum([
  'stt',
  'diarization',
  'language_detection',
  'translation',
  'sentiment',
  'entity_extraction',
  'content_moderation',
  'summarization',
]);
export type ProviderType = z.infer<typeof ProviderType>;

export const ProviderStatus = z.enum([
  'available',
  'unavailable',
  'degraded',
  'rate_limited',
]);
export type ProviderStatus = z.infer<typeof ProviderStatus>;

export const ProviderConfig = z.object({
  id: z.string(),
  name: z.string(),
  type: ProviderType,
  version: z.string(),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(50),
  supportedFormats: z.array(z.string()).optional(),
  supportedLanguages: z.array(z.string()).optional(),
  maxFileSizeBytes: z.number().int().optional(),
  maxDurationMs: z.number().int().optional(),
  rateLimitPerMinute: z.number().int().optional(),
  costPerMinute: z.number().optional(),
  endpoint: z.string().url().optional(),
  apiKeyEnvVar: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});
export type ProviderConfig = z.infer<typeof ProviderConfig>;

export const ProviderHealth = z.object({
  providerId: z.string(),
  status: ProviderStatus,
  latencyMs: z.number().optional(),
  lastChecked: z.string().datetime(),
  errorMessage: z.string().optional(),
  remainingQuota: z.number().optional(),
});
export type ProviderHealth = z.infer<typeof ProviderHealth>;

// ============================================================================
// STT Provider Interface
// ============================================================================

export interface STTRequest {
  mediaAsset: MediaAsset;
  audioUrl?: string;
  audioBuffer?: Buffer;
  language?: string;
  vocabularyHints?: string[];
  enableWordTimings?: boolean;
  enablePunctuation?: boolean;
  enableProfanityFilter?: boolean;
  customModel?: string;
}

export interface STTSegment {
  text: string;
  startTime: number; // milliseconds
  endTime: number;
  confidence: number;
  language?: string;
  words?: WordTiming[];
  speakerLabel?: string;
}

export interface STTResult {
  success: boolean;
  segments: STTSegment[];
  fullText: string;
  language: string;
  languages?: string[];
  confidence: number;
  duration: number;
  wordCount: number;
  provider: string;
  modelVersion: string;
  processingTimeMs: number;
  metadata?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface STTProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedFormats: string[];
  readonly supportedLanguages: string[];
  readonly maxDurationMs: number;
  readonly maxFileSizeBytes: number;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * Check provider health and availability
   */
  healthCheck(): Promise<ProviderHealth>;

  /**
   * Transcribe audio/video to text
   */
  transcribe(request: STTRequest): Promise<STTResult>;

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[];

  /**
   * Estimate cost for transcription
   */
  estimateCost(durationMs: number): number;
}

// ============================================================================
// Diarization Provider Interface
// ============================================================================

export interface DiarizationRequest {
  mediaAsset: MediaAsset;
  audioUrl?: string;
  audioBuffer?: Buffer;
  expectedSpeakerCount?: number;
  minSpeakers?: number;
  maxSpeakers?: number;
  sttSegments?: STTSegment[];
}

export interface SpeakerSegment {
  speakerLabel: string;
  startTime: number;
  endTime: number;
  confidence: number;
  audioFeatures?: {
    pitch?: number;
    energy?: number;
    tempo?: number;
  };
}

export interface SpeakerProfile {
  label: string;
  segments: SpeakerSegment[];
  totalDuration: number;
  speakingRatio: number;
  averageConfidence: number;
  estimatedGender?: 'male' | 'female' | 'unknown';
  voiceFeatures?: {
    pitchMean?: number;
    pitchStd?: number;
    energyMean?: number;
  };
}

export interface DiarizationResult {
  success: boolean;
  speakers: SpeakerProfile[];
  speakerCount: number;
  segments: SpeakerSegment[];
  timeline: Array<{
    time: number;
    speaker: string;
    event: 'start' | 'end' | 'overlap';
  }>;
  provider: string;
  modelVersion: string;
  processingTimeMs: number;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface DiarizationProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedFormats: string[];
  readonly maxDurationMs: number;
  readonly maxSpeakers: number;

  initialize(config: ProviderConfig): Promise<void>;
  healthCheck(): Promise<ProviderHealth>;
  diarize(request: DiarizationRequest): Promise<DiarizationResult>;
  estimateCost(durationMs: number): number;
}

// ============================================================================
// Language Detection Provider Interface
// ============================================================================

export interface LanguageDetectionRequest {
  text?: string;
  audioBuffer?: Buffer;
  audioUrl?: string;
}

export interface DetectedLanguage {
  code: string; // ISO 639-1
  name: string;
  confidence: number;
  isReliable: boolean;
}

export interface LanguageDetectionResult {
  success: boolean;
  primaryLanguage: DetectedLanguage;
  allLanguages: DetectedLanguage[];
  isMultilingual: boolean;
  provider: string;
  processingTimeMs: number;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface LanguageDetectionProvider {
  readonly id: string;
  readonly name: string;

  initialize(config: ProviderConfig): Promise<void>;
  healthCheck(): Promise<ProviderHealth>;
  detect(request: LanguageDetectionRequest): Promise<LanguageDetectionResult>;
}

// ============================================================================
// Translation Provider Interface
// ============================================================================

export interface TranslationRequest {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
  preserveFormatting?: boolean;
  glossary?: Record<string, string>;
}

export interface TranslationResult {
  success: boolean;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  provider: string;
  processingTimeMs: number;
  characterCount: number;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface TranslationProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedLanguages: string[];

  initialize(config: ProviderConfig): Promise<void>;
  healthCheck(): Promise<ProviderHealth>;
  translate(request: TranslationRequest): Promise<TranslationResult>;
  getSupportedLanguagePairs(): Array<{ source: string; target: string }>;
  estimateCost(characterCount: number): number;
}

// ============================================================================
// Content Analysis Provider Interface
// ============================================================================

export interface ContentAnalysisRequest {
  text: string;
  language?: string;
  analysisTypes: Array<
    'sentiment' | 'entities' | 'topics' | 'keywords' | 'summary' | 'moderation'
  >;
}

export interface ExtractedEntity {
  text: string;
  type: string;
  category?: string;
  confidence: number;
  startOffset: number;
  endOffset: number;
  metadata?: Record<string, unknown>;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  magnitude: number; // 0 to infinity
  label: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentences?: Array<{
    text: string;
    score: number;
    magnitude: number;
  }>;
}

export interface ContentAnalysisResult {
  success: boolean;
  sentiment?: SentimentAnalysis;
  entities?: ExtractedEntity[];
  topics?: Array<{ topic: string; confidence: number }>;
  keywords?: Array<{ keyword: string; relevance: number }>;
  summary?: string;
  moderation?: {
    flagged: boolean;
    categories: Array<{ category: string; confidence: number }>;
    reason?: string;
  };
  provider: string;
  processingTimeMs: number;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface ContentAnalysisProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedAnalysisTypes: string[];

  initialize(config: ProviderConfig): Promise<void>;
  healthCheck(): Promise<ProviderHealth>;
  analyze(request: ContentAnalysisRequest): Promise<ContentAnalysisResult>;
}

// ============================================================================
// Provider Registry Types
// ============================================================================

export interface ProviderRegistry {
  stt: Map<string, STTProvider>;
  diarization: Map<string, DiarizationProvider>;
  languageDetection: Map<string, LanguageDetectionProvider>;
  translation: Map<string, TranslationProvider>;
  contentAnalysis: Map<string, ContentAnalysisProvider>;
}

export interface ProviderSelection {
  providerId: string;
  reason: string;
  fallbacks: string[];
}

export interface ProviderSelector {
  selectSTTProvider(
    mediaAsset: MediaAsset,
    preferences?: { language?: string; quality?: 'fast' | 'balanced' | 'accurate' }
  ): Promise<ProviderSelection>;

  selectDiarizationProvider(
    mediaAsset: MediaAsset,
    preferences?: { expectedSpeakers?: number }
  ): Promise<ProviderSelection>;
}
