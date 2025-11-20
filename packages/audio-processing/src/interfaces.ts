import type {
  AudioBuffer,
  AudioMetadata,
  AudioSegment,
  AudioStreamConfig,
  AudioQualityMetrics,
  AudioEnhancementOptions,
  AudioProcessingJob
} from './types.js';

/**
 * Interface for audio processors
 */
export interface IAudioProcessor {
  /**
   * Process audio buffer
   */
  process(audio: AudioBuffer): Promise<AudioBuffer>;

  /**
   * Get processor name
   */
  getName(): string;

  /**
   * Get processor version
   */
  getVersion(): string;
}

/**
 * Interface for audio stream processors
 */
export interface IAudioStreamProcessor {
  /**
   * Initialize stream processor
   */
  initialize(config: AudioStreamConfig): Promise<void>;

  /**
   * Process audio chunk
   */
  processChunk(chunk: Buffer | Uint8Array): Promise<Buffer | Uint8Array>;

  /**
   * Finalize processing
   */
  finalize(): Promise<void>;

  /**
   * Reset processor state
   */
  reset(): void;
}

/**
 * Interface for audio format converters
 */
export interface IAudioConverter {
  /**
   * Convert audio to target format
   */
  convert(audio: AudioBuffer, targetMetadata: Partial<AudioMetadata>): Promise<AudioBuffer>;

  /**
   * Check if conversion is supported
   */
  supportsConversion(source: AudioMetadata, target: Partial<AudioMetadata>): boolean;
}

/**
 * Interface for audio segmentation
 */
export interface IAudioSegmenter {
  /**
   * Segment audio into chunks
   */
  segment(audio: AudioBuffer, config?: SegmentationConfig): Promise<AudioSegment[]>;
}

export interface SegmentationConfig {
  segmentDuration?: number;
  overlapDuration?: number;
  useVAD?: boolean;
  minSilenceDuration?: number;
}

/**
 * Interface for audio quality analyzer
 */
export interface IAudioQualityAnalyzer {
  /**
   * Analyze audio quality
   */
  analyze(audio: AudioBuffer): Promise<AudioQualityMetrics>;

  /**
   * Compare two audio samples
   */
  compare(reference: AudioBuffer, test: AudioBuffer): Promise<AudioQualityMetrics>;
}

/**
 * Interface for audio enhancement
 */
export interface IAudioEnhancer {
  /**
   * Enhance audio
   */
  enhance(audio: AudioBuffer, options: AudioEnhancementOptions): Promise<AudioBuffer>;

  /**
   * Get available enhancement capabilities
   */
  getCapabilities(): string[];
}

/**
 * Interface for audio feature extraction
 */
export interface IAudioFeatureExtractor {
  /**
   * Extract features from audio
   */
  extract(audio: AudioBuffer, featureTypes: string[]): Promise<AudioFeatures>;
}

export interface AudioFeatures {
  mfcc?: number[][];
  spectrogram?: number[][];
  melSpectrogram?: number[][];
  chroma?: number[][];
  zeroCrossingRate?: number[];
  spectralCentroid?: number[];
  spectralRolloff?: number[];
  spectralFlux?: number[];
  energy?: number[];
  pitch?: number[];
  embeddings?: number[];
  [key: string]: unknown;
}

/**
 * Interface for audio storage
 */
export interface IAudioStorage {
  /**
   * Store audio
   */
  store(audio: AudioBuffer, metadata?: Record<string, unknown>): Promise<string>;

  /**
   * Retrieve audio
   */
  retrieve(id: string): Promise<AudioBuffer>;

  /**
   * Delete audio
   */
  delete(id: string): Promise<void>;

  /**
   * List stored audio
   */
  list(filter?: Record<string, unknown>): Promise<Array<{ id: string; metadata: Record<string, unknown> }>>;
}

/**
 * Interface for audio job queue
 */
export interface IAudioJobQueue {
  /**
   * Submit a job
   */
  submit(job: Omit<AudioProcessingJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;

  /**
   * Get job status
   */
  getStatus(jobId: string): Promise<AudioProcessingJob>;

  /**
   * Cancel job
   */
  cancel(jobId: string): Promise<void>;

  /**
   * Get job result
   */
  getResult(jobId: string): Promise<unknown>;
}

/**
 * Interface for audio event listeners
 */
export interface IAudioEventListener {
  /**
   * Called when audio processing starts
   */
  onProcessingStart?(jobId: string): void;

  /**
   * Called when audio processing progresses
   */
  onProcessingProgress?(jobId: string, progress: number): void;

  /**
   * Called when audio processing completes
   */
  onProcessingComplete?(jobId: string, result: unknown): void;

  /**
   * Called when audio processing fails
   */
  onProcessingError?(jobId: string, error: Error): void;
}

/**
 * Interface for audio codec
 */
export interface IAudioCodec {
  /**
   * Encode audio
   */
  encode(audio: AudioBuffer): Promise<Buffer>;

  /**
   * Decode audio
   */
  decode(data: Buffer, metadata: AudioMetadata): Promise<AudioBuffer>;

  /**
   * Get codec name
   */
  getCodecName(): string;
}

/**
 * Interface for audio pipeline
 */
export interface IAudioPipeline {
  /**
   * Add processor to pipeline
   */
  addProcessor(processor: IAudioProcessor): void;

  /**
   * Remove processor from pipeline
   */
  removeProcessor(processorName: string): void;

  /**
   * Execute pipeline
   */
  execute(audio: AudioBuffer): Promise<AudioBuffer>;

  /**
   * Clear pipeline
   */
  clear(): void;
}
