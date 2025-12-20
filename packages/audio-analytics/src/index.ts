/**
 * @intelgraph/audio-analytics
 *
 * Audio feature extraction and analysis including:
 * - MFCCs (Mel-Frequency Cepstral Coefficients)
 * - Spectrograms and mel-spectrograms
 * - Chroma features
 * - Spectral features
 * - Prosodic features
 * - Audio embeddings
 * - Acoustic scene analysis
 */

import { z } from 'zod';
import type { AudioBuffer } from '@intelgraph/audio-processing';

/**
 * Audio features schema
 */
export const AudioFeaturesSchema = z.object({
  mfcc: z.array(z.array(z.number())).optional().describe('Mel-frequency cepstral coefficients'),
  spectrogram: z.array(z.array(z.number())).optional(),
  melSpectrogram: z.array(z.array(z.number())).optional(),
  chroma: z.array(z.array(z.number())).optional(),
  spectralCentroid: z.array(z.number()).optional(),
  spectralRolloff: z.array(z.number()).optional(),
  spectralFlux: z.array(z.number()).optional(),
  zeroCrossingRate: z.array(z.number()).optional(),
  energy: z.array(z.number()).optional(),
  rms: z.array(z.number()).optional(),
  pitch: z.array(z.number()).optional(),
  pitchContour: z.array(z.number()).optional(),
  formants: z.array(z.array(z.number())).optional(),
  embeddings: z.array(z.number()).optional().describe('Audio embedding vector'),
  prosodicFeatures: z.object({
    speakingRate: z.number(),
    pitchMean: z.number(),
    pitchStd: z.number(),
    pitchRange: z.tuple([z.number(), z.number()]),
    energyMean: z.number(),
    energyStd: z.number(),
    pauseDuration: z.number(),
    pauseRate: z.number()
  }).optional()
});

export type AudioFeatures = z.infer<typeof AudioFeaturesSchema>;

/**
 * VAD (Voice Activity Detection) result
 */
export const VADResultSchema = z.object({
  segments: z.array(z.object({
    startTime: z.number(),
    endTime: z.number(),
    confidence: z.number().min(0).max(1),
    isSpeech: z.boolean()
  })),
  speechRatio: z.number().min(0).max(1).describe('Ratio of speech to total duration'),
  totalSpeechDuration: z.number(),
  totalSilenceDuration: z.number()
});

export type VADResult = z.infer<typeof VADResultSchema>;

/**
 * Keyword spotting result
 */
export const KeywordSpottingResultSchema = z.object({
  keyword: z.string(),
  detections: z.array(z.object({
    startTime: z.number(),
    endTime: z.number(),
    confidence: z.number().min(0).max(1)
  })),
  count: z.number().int().nonnegative()
});

export type KeywordSpottingResult = z.infer<typeof KeywordSpottingResultSchema>;

/**
 * Acoustic scene classification result
 */
export const AcousticSceneSchema = z.object({
  scene: z.string().describe('Detected scene type'),
  confidence: z.number().min(0).max(1),
  alternatives: z.array(z.object({
    scene: z.string(),
    confidence: z.number().min(0).max(1)
  })).optional(),
  tags: z.array(z.string()).optional()
});

export type AcousticScene = z.infer<typeof AcousticSceneSchema>;

/**
 * Sentiment analysis from speech
 */
export const SpeechSentimentSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  confidence: z.number().min(0).max(1),
  scores: z.object({
    positive: z.number(),
    negative: z.number(),
    neutral: z.number()
  }),
  valence: z.number().min(-1).max(1),
  arousal: z.number().min(0).max(1),
  dominance: z.number().min(0).max(1).optional()
});

export type SpeechSentiment = z.infer<typeof SpeechSentimentSchema>;

/**
 * Interfaces for feature extractors
 */
export interface IFeatureExtractor {
  extract(audio: AudioBuffer): Promise<AudioFeatures>;
  extractSpecific(audio: AudioBuffer, featureTypes: string[]): Promise<Partial<AudioFeatures>>;
}

export interface IVADDetector {
  detect(audio: AudioBuffer, options?: VADOptions): Promise<VADResult>;
}

export interface VADOptions {
  aggressiveness?: number; // 0-3
  minSpeechDuration?: number;
  minSilenceDuration?: number;
  algorithm?: 'energy' | 'statistical' | 'neural';
}

export interface IKeywordSpotter {
  spot(audio: AudioBuffer, keywords: string[]): Promise<KeywordSpottingResult[]>;
}

export interface IAcousticSceneClassifier {
  classify(audio: AudioBuffer): Promise<AcousticScene>;
}

export interface ISpeechSentimentAnalyzer {
  analyze(audio: AudioBuffer): Promise<SpeechSentiment>;
}

/**
 * Speech analytics
 */
export const SpeechAnalyticsResultSchema = z.object({
  speakingRate: z.number().describe('Words per minute'),
  articulation: z.number().min(0).max(1).describe('Articulation clarity score'),
  fillerWordCount: z.number().int().nonnegative(),
  fillerWords: z.array(z.object({
    word: z.string(),
    count: z.number(),
    timestamps: z.array(z.number())
  })),
  pauseCount: z.number().int().nonnegative(),
  averagePauseDuration: z.number(),
  longestPause: z.number(),
  intonation: z.object({
    variety: z.number().min(0).max(1),
    monotoneScore: z.number().min(0).max(1)
  }),
  loudness: z.object({
    mean: z.number(),
    max: z.number(),
    min: z.number(),
    variability: z.number()
  })
});

export type SpeechAnalyticsResult = z.infer<typeof SpeechAnalyticsResultSchema>;

export interface ISpeechAnalyzer {
  analyze(audio: AudioBuffer, transcript?: string): Promise<SpeechAnalyticsResult>;
}
