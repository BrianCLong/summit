/**
 * @intelgraph/audio-processing
 *
 * Core audio processing types, interfaces, and utilities for the IntelGraph platform.
 * Provides foundational building blocks for audio analysis, speech processing, and acoustic intelligence.
 */

// Export all types
export * from './types.js';

// Export all interfaces
export * from './interfaces.js';

// Export all utilities
export * from './utils.js';

// Re-export commonly used items for convenience
export type {
  AudioBuffer,
  AudioMetadata,
  AudioSegment,
  AudioStreamConfig,
  AudioQualityMetrics,
  AudioEnhancementOptions,
  AudioProcessingJob
} from './types.js';

export type {
  IAudioProcessor,
  IAudioStreamProcessor,
  IAudioConverter,
  IAudioSegmenter,
  IAudioQualityAnalyzer,
  IAudioEnhancer,
  IAudioFeatureExtractor,
  IAudioStorage,
  IAudioJobQueue,
  AudioFeatures
} from './interfaces.js';

export {
  AudioFormat,
  AudioCodec,
  SampleRate,
  ChannelConfig,
  JobStatus
} from './types.js';
