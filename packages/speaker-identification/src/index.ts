/**
 * @intelgraph/speaker-identification
 *
 * Speaker identification, verification, and voice biometrics including:
 * - Voice biometric enrollment
 * - Speaker verification (1:1)
 * - Speaker identification (1:N)
 * - Speaker diarization
 * - Voice characteristic analysis
 * - Deepfake and voice cloning detection
 * - Speaker clustering and separation
 */

// Export types
export * from './types.js';

// Export interfaces
export * from './interfaces.js';

// Re-export commonly used items
export type {
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

export type {
  IVoiceBiometricEnroller,
  ISpeakerVerifier,
  ISpeakerIdentifier,
  ISpeakerDiarizer,
  IVoiceAnalyzer,
  IDeepfakeDetector,
  IVoiceCloningDetector,
  ISpeakerClusterer,
  ISpeakerSeparator,
  IVoiceEmbeddingExtractor,
  IVoiceDatabase
} from './interfaces.js';
