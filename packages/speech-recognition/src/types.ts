import { z } from 'zod';
import type { AudioBuffer } from '@intelgraph/audio-processing';

/**
 * Speech recognition provider
 */
export enum STTProvider {
  WHISPER = 'whisper',
  GOOGLE = 'google',
  AWS = 'aws',
  AZURE = 'azure',
  CUSTOM = 'custom'
}

/**
 * Whisper model size
 */
export enum WhisperModel {
  TINY = 'tiny',
  BASE = 'base',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  LARGE_V2 = 'large-v2',
  LARGE_V3 = 'large-v3'
}

/**
 * Transcription word with timing
 */
export const TranscriptionWordSchema = z.object({
  word: z.string(),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  confidence: z.number().min(0).max(1)
});

export type TranscriptionWord = z.infer<typeof TranscriptionWordSchema>;

/**
 * Speaker information for diarization
 */
export const SpeakerInfoSchema = z.object({
  speakerId: z.string(),
  speakerTag: z.string().optional(),
  speakerName: z.string().optional(),
  confidence: z.number().min(0).max(1).optional()
});

export type SpeakerInfo = z.infer<typeof SpeakerInfoSchema>;

/**
 * Transcription segment
 */
export const TranscriptionSegmentSchema = z.object({
  text: z.string(),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  confidence: z.number().min(0).max(1),
  words: z.array(TranscriptionWordSchema).optional(),
  speaker: SpeakerInfoSchema.optional(),
  language: z.string().optional(),
  languageConfidence: z.number().min(0).max(1).optional()
});

export type TranscriptionSegment = z.infer<typeof TranscriptionSegmentSchema>;

/**
 * Complete transcription result
 */
export const TranscriptionResultSchema = z.object({
  text: z.string().describe('Full transcription text'),
  segments: z.array(TranscriptionSegmentSchema),
  language: z.string().describe('Detected language code'),
  languageConfidence: z.number().min(0).max(1).optional(),
  duration: z.number().positive(),
  provider: z.nativeEnum(STTProvider),
  model: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>;

/**
 * STT configuration
 */
export const STTConfigSchema = z.object({
  provider: z.nativeEnum(STTProvider),
  language: z.string().default('en-US').describe('Language code (BCP-47)'),
  alternativeLanguages: z.array(z.string()).optional(),
  enableAutomaticPunctuation: z.boolean().default(true),
  enableWordTimestamps: z.boolean().default(true),
  enableSpeakerDiarization: z.boolean().default(false),
  maxSpeakers: z.number().int().positive().optional(),
  minSpeakers: z.number().int().positive().optional(),
  profanityFilter: z.boolean().default(false),
  customVocabulary: z.array(z.string()).optional(),
  vocabularyFilterName: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  apiKey: z.string().optional(),
  region: z.string().optional(),
  endpoint: z.string().url().optional()
});

export type STTConfig = z.infer<typeof STTConfigSchema>;

/**
 * Streaming recognition configuration
 */
export const StreamingRecognitionConfigSchema = STTConfigSchema.extend({
  interimResults: z.boolean().default(true),
  singleUtterance: z.boolean().default(false),
  vadEnabled: z.boolean().default(true),
  silenceTimeout: z.number().positive().optional().describe('Silence timeout in ms')
});

export type StreamingRecognitionConfig = z.infer<typeof StreamingRecognitionConfigSchema>;

/**
 * Language detection result
 */
export const LanguageDetectionResultSchema = z.object({
  language: z.string(),
  confidence: z.number().min(0).max(1),
  alternativeLanguages: z.array(z.object({
    language: z.string(),
    confidence: z.number().min(0).max(1)
  })).optional()
});

export type LanguageDetectionResult = z.infer<typeof LanguageDetectionResultSchema>;

/**
 * Supported languages list
 */
export const SUPPORTED_LANGUAGES = [
  'en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'pt-PT',
  'ru-RU', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'ar-SA', 'hi-IN', 'nl-NL', 'pl-PL',
  'sv-SE', 'no-NO', 'da-DK', 'fi-FI', 'tr-TR', 'el-GR', 'he-IL', 'th-TH', 'vi-VN',
  'id-ID', 'ms-MY', 'fil-PH', 'uk-UA', 'cs-CZ', 'ro-RO', 'hu-HU', 'bg-BG', 'hr-HR',
  'sk-SK', 'sl-SI', 'sr-RS', 'ca-ES', 'fa-IR', 'ur-PK', 'bn-IN', 'ta-IN', 'te-IN',
  'ml-IN', 'kn-IN', 'gu-IN', 'mr-IN', 'pa-IN', 'af-ZA', 'sw-KE', 'am-ET', 'my-MM',
  'km-KH', 'lo-LA', 'si-LK', 'ne-NP', 'ka-GE', 'hy-AM', 'az-AZ', 'uz-UZ', 'kk-KZ'
] as const;

/**
 * Transcription error types
 */
export class TranscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: STTProvider,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

export class ProviderError extends TranscriptionError {
  constructor(provider: STTProvider, message: string, details?: unknown) {
    super(message, 'PROVIDER_ERROR', provider, details);
    this.name = 'ProviderError';
  }
}

export class LanguageNotSupportedError extends TranscriptionError {
  constructor(language: string, provider: STTProvider) {
    super(
      `Language ${language} is not supported by provider ${provider}`,
      'LANGUAGE_NOT_SUPPORTED',
      provider,
      { language }
    );
    this.name = 'LanguageNotSupportedError';
  }
}

export class AudioTooLongError extends TranscriptionError {
  constructor(duration: number, maxDuration: number, provider: STTProvider) {
    super(
      `Audio duration ${duration}s exceeds maximum ${maxDuration}s for provider ${provider}`,
      'AUDIO_TOO_LONG',
      provider,
      { duration, maxDuration }
    );
    this.name = 'AudioTooLongError';
  }
}
