import type { AudioBuffer } from '@intelgraph/audio-processing';
import type {
  VoiceBiometric,
  VerificationResult,
  IdentificationResult,
  DiarizationSegment,
  VoiceCharacteristics,
  DeepfakeDetectionResult,
  VoiceCloningDetection,
  SpeakerCluster,
  SpeakerSeparationResult
} from './types.js';

/**
 * Interface for voice biometric enrollment
 */
export interface IVoiceBiometricEnroller {
  /**
   * Enroll a speaker
   */
  enroll(speakerName: string, audioSamples: AudioBuffer[]): Promise<VoiceBiometric>;

  /**
   * Update enrollment
   */
  updateEnrollment(speakerId: string, additionalSamples: AudioBuffer[]): Promise<VoiceBiometric>;

  /**
   * Delete enrollment
   */
  deleteEnrollment(speakerId: string): Promise<void>;

  /**
   * Get enrollment
   */
  getEnrollment(speakerId: string): Promise<VoiceBiometric | null>;
}

/**
 * Interface for speaker verification (1:1 matching)
 */
export interface ISpeakerVerifier {
  /**
   * Verify speaker identity
   */
  verify(audio: AudioBuffer, claimedSpeakerId: string): Promise<VerificationResult>;

  /**
   * Set verification threshold
   */
  setThreshold(threshold: number): void;

  /**
   * Get verification threshold
   */
  getThreshold(): number;
}

/**
 * Interface for speaker identification (1:N matching)
 */
export interface ISpeakerIdentifier {
  /**
   * Identify speaker from audio
   */
  identify(audio: AudioBuffer, topN?: number): Promise<IdentificationResult[]>;

  /**
   * Identify speaker from candidates
   */
  identifyFromCandidates(audio: AudioBuffer, candidateIds: string[]): Promise<IdentificationResult[]>;
}

/**
 * Interface for speaker diarization
 */
export interface ISpeakerDiarizer {
  /**
   * Perform speaker diarization
   */
  diarize(audio: AudioBuffer, options?: DiarizationOptions): Promise<DiarizationSegment[]>;

  /**
   * Get speaker count estimate
   */
  estimateSpeakerCount(audio: AudioBuffer): Promise<number>;
}

export interface DiarizationOptions {
  minSpeakers?: number;
  maxSpeakers?: number;
  minSegmentDuration?: number;
  algorithm?: 'clustering' | 'neural' | 'hybrid';
}

/**
 * Interface for voice characteristic analysis
 */
export interface IVoiceAnalyzer {
  /**
   * Analyze voice characteristics
   */
  analyze(audio: AudioBuffer): Promise<VoiceCharacteristics>;

  /**
   * Compare voice characteristics
   */
  compare(voice1: VoiceCharacteristics, voice2: VoiceCharacteristics): Promise<number>;
}

/**
 * Interface for deepfake detection
 */
export interface IDeepfakeDetector {
  /**
   * Detect if audio is deepfake
   */
  detect(audio: AudioBuffer): Promise<DeepfakeDetectionResult>;

  /**
   * Verify audio authenticity
   */
  verifyAuthenticity(audio: AudioBuffer, referenceAudio?: AudioBuffer): Promise<boolean>;
}

/**
 * Interface for voice cloning detection
 */
export interface IVoiceCloningDetector {
  /**
   * Detect voice cloning
   */
  detect(audio: AudioBuffer, originalSpeakerId?: string): Promise<VoiceCloningDetection>;
}

/**
 * Interface for speaker clustering
 */
export interface ISpeakerClusterer {
  /**
   * Cluster speakers in audio
   */
  cluster(audio: AudioBuffer, options?: ClusteringOptions): Promise<SpeakerCluster[]>;

  /**
   * Cluster multiple audio samples
   */
  clusterMultiple(audioSamples: AudioBuffer[]): Promise<SpeakerCluster[]>;
}

export interface ClusteringOptions {
  numClusters?: number;
  algorithm?: 'kmeans' | 'dbscan' | 'hierarchical' | 'spectral';
  distanceMetric?: 'euclidean' | 'cosine' | 'manhattan';
}

/**
 * Interface for speaker separation
 */
export interface ISpeakerSeparator {
  /**
   * Separate speakers in multi-speaker audio
   */
  separate(audio: AudioBuffer): Promise<SpeakerSeparationResult>;

  /**
   * Extract specific speaker
   */
  extractSpeaker(audio: AudioBuffer, speakerId: string): Promise<AudioBuffer>;
}

/**
 * Interface for voice embedding extraction
 */
export interface IVoiceEmbeddingExtractor {
  /**
   * Extract voice embedding
   */
  extract(audio: AudioBuffer): Promise<number[]>;

  /**
   * Get embedding dimension
   */
  getDimension(): number;

  /**
   * Get model name
   */
  getModelName(): string;
}

/**
 * Interface for voice database
 */
export interface IVoiceDatabase {
  /**
   * Store voice biometric
   */
  store(biometric: VoiceBiometric): Promise<void>;

  /**
   * Retrieve voice biometric
   */
  retrieve(speakerId: string): Promise<VoiceBiometric | null>;

  /**
   * Search for similar voices
   */
  search(embedding: number[], topN: number): Promise<Array<{ speakerId: string; similarity: number }>>;

  /**
   * Delete voice biometric
   */
  delete(speakerId: string): Promise<void>;

  /**
   * List all speaker IDs
   */
  list(): Promise<string[]>;
}
