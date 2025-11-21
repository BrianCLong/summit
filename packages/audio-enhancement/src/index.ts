/**
 * @intelgraph/audio-enhancement
 *
 * Audio enhancement capabilities including:
 * - Noise reduction and denoising
 * - Echo cancellation
 * - Reverberation removal
 * - Audio super-resolution
 * - Speech enhancement
 * - Dynamic range compression
 */

import { z } from 'zod';
import type { AudioBuffer } from '@intelgraph/audio-processing';

export const NoiseReductionConfigSchema = z.object({
  algorithm: z.enum(['spectral-subtraction', 'wiener-filter', 'rnn', 'transformer']).default('rnn'),
  strength: z.number().min(0).max(1).default(0.5),
  noiseProfile: z.array(z.number()).optional(),
  adaptiveMode: z.boolean().default(true)
});

export type NoiseReductionConfig = z.infer<typeof NoiseReductionConfigSchema>;

export const EnhancementResultSchema = z.object({
  enhancedAudio: z.instanceof(Buffer),
  metrics: z.object({
    snrImprovement: z.number().optional(),
    qualityScore: z.number().min(0).max(1),
    processingTime: z.number()
  })
});

export type EnhancementResult = z.infer<typeof EnhancementResultSchema>;

export interface INoiseReducer {
  reduce(audio: AudioBuffer, config?: NoiseReductionConfig): Promise<EnhancementResult>;
  learnNoiseProfile(noiseAudio: AudioBuffer): Promise<number[]>;
}

export interface IEchoCanceller {
  cancel(audio: AudioBuffer): Promise<AudioBuffer>;
}

export interface IAudioSuperResolution {
  enhance(audio: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer>;
}

export interface ISpeechEnhancer {
  enhance(audio: AudioBuffer): Promise<AudioBuffer>;
}
