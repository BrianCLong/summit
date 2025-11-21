import { z } from 'zod';

/**
 * Voice biometric enrollment
 */
export const VoiceBiometricSchema = z.object({
  speakerId: z.string().uuid(),
  speakerName: z.string(),
  voiceprint: z.array(z.number()).describe('Voice embedding vector'),
  enrollmentDate: z.date(),
  audioSamples: z.array(z.string()).describe('Audio sample references'),
  quality: z.number().min(0).max(1).describe('Enrollment quality score'),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type VoiceBiometric = z.infer<typeof VoiceBiometricSchema>;

/**
 * Speaker verification result
 */
export const VerificationResultSchema = z.object({
  verified: z.boolean(),
  confidence: z.number().min(0).max(1),
  score: z.number(),
  threshold: z.number(),
  speakerId: z.string(),
  decision: z.enum(['accept', 'reject', 'uncertain'])
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;

/**
 * Speaker identification result
 */
export const IdentificationResultSchema = z.object({
  speakerId: z.string(),
  speakerName: z.string().optional(),
  confidence: z.number().min(0).max(1),
  score: z.number(),
  rank: z.number().int().positive(),
  alternatives: z.array(z.object({
    speakerId: z.string(),
    confidence: z.number().min(0).max(1),
    score: z.number()
  })).optional()
});

export type IdentificationResult = z.infer<typeof IdentificationResultSchema>;

/**
 * Speaker diarization segment
 */
export const DiarizationSegmentSchema = z.object({
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  speakerId: z.string(),
  confidence: z.number().min(0).max(1),
  label: z.string().optional()
});

export type DiarizationSegment = z.infer<typeof DiarizationSegmentSchema>;

/**
 * Voice characteristics
 */
export const VoiceCharacteristicsSchema = z.object({
  fundamentalFrequency: z.number().describe('F0 in Hz'),
  pitchRange: z.tuple([z.number(), z.number()]),
  speakingRate: z.number().describe('Words per minute'),
  jitter: z.number().describe('Pitch variation'),
  shimmer: z.number().describe('Amplitude variation'),
  hnr: z.number().describe('Harmonics-to-noise ratio'),
  age: z.object({
    estimated: z.number().int().positive(),
    confidence: z.number().min(0).max(1)
  }).optional(),
  gender: z.object({
    estimated: z.enum(['male', 'female', 'other']),
    confidence: z.number().min(0).max(1)
  }).optional(),
  emotion: z.object({
    detected: z.string(),
    confidence: z.number().min(0).max(1),
    valence: z.number().min(-1).max(1),
    arousal: z.number().min(0).max(1)
  }).optional(),
  accent: z.object({
    detected: z.string(),
    confidence: z.number().min(0).max(1)
  }).optional()
});

export type VoiceCharacteristics = z.infer<typeof VoiceCharacteristicsSchema>;

/**
 * Deepfake detection result
 */
export const DeepfakeDetectionResultSchema = z.object({
  isDeepfake: z.boolean(),
  confidence: z.number().min(0).max(1),
  score: z.number(),
  indicators: z.array(z.object({
    type: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    description: z.string()
  })),
  analysisMethod: z.string()
});

export type DeepfakeDetectionResult = z.infer<typeof DeepfakeDetectionResultSchema>;

/**
 * Voice cloning detection result
 */
export const VoiceCloningDetectionSchema = z.object({
  isCloned: z.boolean(),
  confidence: z.number().min(0).max(1),
  originalSpeaker: z.string().optional(),
  artifacts: z.array(z.string()),
  technicalMarkers: z.record(z.number())
});

export type VoiceCloningDetection = z.infer<typeof VoiceCloningDetectionSchema>;

/**
 * Speaker clustering result
 */
export const SpeakerClusterSchema = z.object({
  clusterId: z.string(),
  speakerCount: z.number().int().positive(),
  segments: z.array(DiarizationSegmentSchema),
  centroid: z.array(z.number()).describe('Cluster centroid embedding'),
  cohesion: z.number().min(0).max(1)
});

export type SpeakerCluster = z.infer<typeof SpeakerClusterSchema>;

/**
 * Multi-speaker separation result
 */
export const SpeakerSeparationResultSchema = z.object({
  speakers: z.array(z.object({
    speakerId: z.string(),
    audioData: z.instanceof(Buffer),
    segments: z.array(DiarizationSegmentSchema)
  })),
  method: z.string(),
  quality: z.number().min(0).max(1)
});

export type SpeakerSeparationResult = z.infer<typeof SpeakerSeparationResultSchema>;
