/**
 * Deepfake Detection Types
 * Comprehensive type definitions for deepfake detection and analysis
 */

export interface DeepfakeDetectionResult {
  isDeepfake: boolean;
  confidence: number;
  detectionMethod: DetectionMethod;
  artifacts: DetectedArtifact[];
  metadata: DetectionMetadata;
  warnings: string[];
  recommendations: string[];
}

export enum DetectionMethod {
  FACIAL_MANIPULATION = 'facial_manipulation',
  VOICE_SYNTHESIS = 'voice_synthesis',
  VIDEO_MANIPULATION = 'video_manipulation',
  AUDIO_DEEPFAKE = 'audio_deepfake',
  GAN_DETECTION = 'gan_detection',
  TEMPORAL_ANALYSIS = 'temporal_analysis',
  LIGHTING_PHYSICS = 'lighting_physics',
  BIOMETRIC_ANOMALY = 'biometric_anomaly',
  COMPRESSION_ARTIFACT = 'compression_artifact',
  MULTI_MODAL = 'multi_modal',
}

export interface DetectedArtifact {
  type: ArtifactType;
  location: ArtifactLocation;
  severity: number;
  description: string;
  evidence: string[];
}

export enum ArtifactType {
  FACIAL_BOUNDARY = 'facial_boundary',
  EYE_BLINK_ANOMALY = 'eye_blink_anomaly',
  LIP_SYNC_MISMATCH = 'lip_sync_mismatch',
  SKIN_TEXTURE_INCONSISTENCY = 'skin_texture_inconsistency',
  LIGHTING_INCONSISTENCY = 'lighting_inconsistency',
  SHADOW_MISMATCH = 'shadow_mismatch',
  TEMPORAL_DISCONTINUITY = 'temporal_discontinuity',
  FREQUENCY_ARTIFACT = 'frequency_artifact',
  SPECTRAL_ANOMALY = 'spectral_anomaly',
  COMPRESSION_PATTERN = 'compression_pattern',
  GAN_FINGERPRINT = 'gan_fingerprint',
  BIOMETRIC_MISMATCH = 'biometric_mismatch',
}

export interface ArtifactLocation {
  frame?: number;
  timestamp?: number;
  coordinates?: BoundingBox;
  frequency?: FrequencyRange;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrequencyRange {
  min: number;
  max: number;
  unit: 'Hz' | 'kHz';
}

export interface DetectionMetadata {
  timestamp: Date;
  processingTime: number;
  modelVersions: ModelVersion[];
  inputMetadata: InputMetadata;
  qualityMetrics: QualityMetrics;
}

export interface ModelVersion {
  name: string;
  version: string;
  accuracy: number;
}

export interface InputMetadata {
  format: string;
  duration?: number;
  resolution?: Resolution;
  frameRate?: number;
  sampleRate?: number;
  bitrate?: number;
  codec?: string;
}

export interface Resolution {
  width: number;
  height: number;
}

export interface QualityMetrics {
  overallQuality: number;
  noiseLevel: number;
  compression: number;
  clarity: number;
}

export interface FacialAnalysisResult {
  faceDetected: boolean;
  faceCount: number;
  manipulationScore: number;
  landmarks: FacialLandmark[];
  inconsistencies: FacialInconsistency[];
  blinkRate: BlinkAnalysis;
  microExpressions: MicroExpression[];
}

export interface FacialLandmark {
  type: string;
  position: Point3D;
  confidence: number;
}

export interface Point3D {
  x: number;
  y: number;
  z?: number;
}

export interface FacialInconsistency {
  type: string;
  severity: number;
  location: BoundingBox;
  description: string;
}

export interface BlinkAnalysis {
  rate: number;
  naturalness: number;
  anomalies: number;
}

export interface MicroExpression {
  type: string;
  timestamp: number;
  confidence: number;
  authenticity: number;
}

export interface VoiceAnalysisResult {
  isSynthetic: boolean;
  synthesisScore: number;
  voiceCharacteristics: VoiceCharacteristics;
  spectralAnomalies: SpectralAnomaly[];
  prosodyAnalysis: ProsodyAnalysis;
  artifactDetection: AudioArtifact[];
}

export interface VoiceCharacteristics {
  pitch: PitchAnalysis;
  formants: number[];
  spectralCentroid: number;
  harmonicRatio: number;
  jitter: number;
  shimmer: number;
}

export interface PitchAnalysis {
  mean: number;
  variance: number;
  range: { min: number; max: number };
  contour: number[];
}

export interface SpectralAnomaly {
  frequency: number;
  magnitude: number;
  timestamp: number;
  type: string;
}

export interface ProsodyAnalysis {
  naturalness: number;
  rhythm: number;
  intonation: number;
  stress: number;
  timing: number;
}

export interface AudioArtifact {
  type: string;
  timestamp: number;
  severity: number;
  description: string;
}

export interface VideoAnalysisResult {
  manipulationDetected: boolean;
  manipulationScore: number;
  temporalConsistency: TemporalConsistency;
  lightingAnalysis: LightingAnalysis;
  physicsValidation: PhysicsValidation;
  compressionAnalysis: CompressionAnalysis;
}

export interface TemporalConsistency {
  score: number;
  discontinuities: TemporalDiscontinuity[];
  frameCoherence: number;
  motionConsistency: number;
}

export interface TemporalDiscontinuity {
  frameStart: number;
  frameEnd: number;
  severity: number;
  type: string;
}

export interface LightingAnalysis {
  consistency: number;
  shadowAnalysis: ShadowAnalysis;
  reflectionAnalysis: ReflectionAnalysis;
  colorTemperature: ColorTemperature;
}

export interface ShadowAnalysis {
  naturalness: number;
  inconsistencies: ShadowInconsistency[];
}

export interface ShadowInconsistency {
  location: BoundingBox;
  severity: number;
  description: string;
}

export interface ReflectionAnalysis {
  naturalness: number;
  inconsistencies: string[];
}

export interface ColorTemperature {
  value: number;
  consistency: number;
}

export interface PhysicsValidation {
  score: number;
  violations: PhysicsViolation[];
}

export interface PhysicsViolation {
  type: string;
  severity: number;
  frame: number;
  description: string;
}

export interface CompressionAnalysis {
  pattern: string;
  consistency: number;
  anomalies: CompressionAnomaly[];
}

export interface CompressionAnomaly {
  location: BoundingBox;
  type: string;
  severity: number;
}

export interface GANDetectionResult {
  isGANGenerated: boolean;
  confidence: number;
  generatorType: string | null;
  fingerprints: GANFingerprint[];
  trainingArtifacts: TrainingArtifact[];
}

export interface GANFingerprint {
  type: string;
  strength: number;
  location: string;
}

export interface TrainingArtifact {
  type: string;
  evidence: string;
  confidence: number;
}

export interface BiometricAnalysis {
  isAuthentic: boolean;
  confidence: number;
  biometricType: BiometricType;
  anomalies: BiometricAnomaly[];
  verificationScore: number;
}

export enum BiometricType {
  FACIAL = 'facial',
  VOICE = 'voice',
  GAIT = 'gait',
  BEHAVIORAL = 'behavioral',
}

export interface BiometricAnomaly {
  type: string;
  severity: number;
  description: string;
  evidence: string[];
}
