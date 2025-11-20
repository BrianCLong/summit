import { z } from 'zod';

/**
 * Audio format specifications
 */
export enum AudioFormat {
  WAV = 'wav',
  MP3 = 'mp3',
  FLAC = 'flac',
  OGG = 'ogg',
  OPUS = 'opus',
  M4A = 'm4a',
  AAC = 'aac',
  PCM = 'pcm',
  RAW = 'raw'
}

/**
 * Audio codec types
 */
export enum AudioCodec {
  PCM = 'pcm',
  OPUS = 'opus',
  G711_ULAW = 'g711-ulaw',
  G711_ALAW = 'g711-alaw',
  AAC = 'aac',
  MP3 = 'mp3',
  FLAC = 'flac',
  VORBIS = 'vorbis'
}

/**
 * Sample rate in Hz
 */
export enum SampleRate {
  Hz8000 = 8000,
  Hz11025 = 11025,
  Hz16000 = 16000,
  Hz22050 = 22050,
  Hz32000 = 32000,
  Hz44100 = 44100,
  Hz48000 = 48000,
  Hz96000 = 96000
}

/**
 * Audio channel configuration
 */
export enum ChannelConfig {
  MONO = 1,
  STEREO = 2,
  SURROUND_5_1 = 6,
  SURROUND_7_1 = 8
}

/**
 * Audio metadata schema
 */
export const AudioMetadataSchema = z.object({
  duration: z.number().positive().describe('Duration in seconds'),
  sampleRate: z.number().positive().describe('Sample rate in Hz'),
  channels: z.number().int().positive().describe('Number of channels'),
  bitDepth: z.number().int().positive().optional().describe('Bit depth (8, 16, 24, 32)'),
  bitrate: z.number().positive().optional().describe('Bitrate in kbps'),
  codec: z.nativeEnum(AudioCodec).describe('Audio codec'),
  format: z.nativeEnum(AudioFormat).describe('Audio format'),
  fileSize: z.number().positive().optional().describe('File size in bytes'),
  checksum: z.string().optional().describe('MD5 or SHA256 checksum')
});

export type AudioMetadata = z.infer<typeof AudioMetadataSchema>;

/**
 * Audio buffer representation
 */
export const AudioBufferSchema = z.object({
  data: z.instanceof(Buffer).or(z.instanceof(Uint8Array)).describe('Audio data buffer'),
  metadata: AudioMetadataSchema,
  timestamp: z.date().optional().describe('Capture timestamp'),
  source: z.string().optional().describe('Audio source identifier')
});

export type AudioBuffer = z.infer<typeof AudioBufferSchema>;

/**
 * Audio stream configuration
 */
export const AudioStreamConfigSchema = z.object({
  sampleRate: z.nativeEnum(SampleRate),
  channels: z.nativeEnum(ChannelConfig),
  codec: z.nativeEnum(AudioCodec),
  bitrate: z.number().positive().optional(),
  chunkSize: z.number().int().positive().optional().describe('Chunk size in samples'),
  enableVAD: z.boolean().optional().describe('Enable voice activity detection'),
  enableNoiseReduction: z.boolean().optional()
});

export type AudioStreamConfig = z.infer<typeof AudioStreamConfigSchema>;

/**
 * Audio processing job status
 */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Audio processing job
 */
export const AudioProcessingJobSchema = z.object({
  id: z.string().uuid(),
  type: z.string().describe('Job type (transcription, analysis, etc.)'),
  status: z.nativeEnum(JobStatus),
  audioSource: z.string().describe('Audio source URL or path'),
  config: z.record(z.string(), z.unknown()).optional(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional()
});

export type AudioProcessingJob = z.infer<typeof AudioProcessingJobSchema>;

/**
 * Audio segment for processing
 */
export const AudioSegmentSchema = z.object({
  id: z.string(),
  startTime: z.number().nonnegative().describe('Start time in seconds'),
  endTime: z.number().positive().describe('End time in seconds'),
  data: z.instanceof(Buffer).or(z.instanceof(Uint8Array)),
  metadata: AudioMetadataSchema.optional(),
  label: z.string().optional().describe('Segment label or classification')
});

export type AudioSegment = z.infer<typeof AudioSegmentSchema>;

/**
 * Audio quality metrics
 */
export const AudioQualityMetricsSchema = z.object({
  snr: z.number().optional().describe('Signal-to-noise ratio in dB'),
  thd: z.number().optional().describe('Total harmonic distortion'),
  pesq: z.number().optional().describe('Perceptual Evaluation of Speech Quality'),
  polqa: z.number().optional().describe('Perceptual Objective Listening Quality Assessment'),
  clipRate: z.number().optional().describe('Clipping rate percentage'),
  dynamicRange: z.number().optional().describe('Dynamic range in dB'),
  loudness: z.number().optional().describe('Integrated loudness in LUFS')
});

export type AudioQualityMetrics = z.infer<typeof AudioQualityMetricsSchema>;

/**
 * Processing options for audio enhancement
 */
export const AudioEnhancementOptionsSchema = z.object({
  noiseReduction: z.boolean().default(false),
  noiseReductionLevel: z.number().min(0).max(1).default(0.5),
  echoCancellation: z.boolean().default(false),
  reverbRemoval: z.boolean().default(false),
  normalization: z.boolean().default(false),
  targetLoudness: z.number().optional().describe('Target loudness in LUFS'),
  bandwidthExtension: z.boolean().default(false),
  superResolution: z.boolean().default(false)
});

export type AudioEnhancementOptions = z.infer<typeof AudioEnhancementOptionsSchema>;

/**
 * Error types for audio processing
 */
export class AudioProcessingError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = 'AudioProcessingError';
  }
}

export class AudioFormatError extends AudioProcessingError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUDIO_FORMAT_ERROR', details);
    this.name = 'AudioFormatError';
  }
}

export class AudioStreamError extends AudioProcessingError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUDIO_STREAM_ERROR', details);
    this.name = 'AudioStreamError';
  }
}

export class AudioEnhancementError extends AudioProcessingError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUDIO_ENHANCEMENT_ERROR', details);
    this.name = 'AudioEnhancementError';
  }
}
