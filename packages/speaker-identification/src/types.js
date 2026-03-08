"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeakerSeparationResultSchema = exports.SpeakerClusterSchema = exports.VoiceCloningDetectionSchema = exports.DeepfakeDetectionResultSchema = exports.VoiceCharacteristicsSchema = exports.DiarizationSegmentSchema = exports.IdentificationResultSchema = exports.VerificationResultSchema = exports.VoiceBiometricSchema = void 0;
const zod_1 = require("zod");
/**
 * Voice biometric enrollment
 */
exports.VoiceBiometricSchema = zod_1.z.object({
    speakerId: zod_1.z.string().uuid(),
    speakerName: zod_1.z.string(),
    voiceprint: zod_1.z.array(zod_1.z.number()).describe('Voice embedding vector'),
    enrollmentDate: zod_1.z.date(),
    audioSamples: zod_1.z.array(zod_1.z.string()).describe('Audio sample references'),
    quality: zod_1.z.number().min(0).max(1).describe('Enrollment quality score'),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional()
});
/**
 * Speaker verification result
 */
exports.VerificationResultSchema = zod_1.z.object({
    verified: zod_1.z.boolean(),
    confidence: zod_1.z.number().min(0).max(1),
    score: zod_1.z.number(),
    threshold: zod_1.z.number(),
    speakerId: zod_1.z.string(),
    decision: zod_1.z.enum(['accept', 'reject', 'uncertain'])
});
/**
 * Speaker identification result
 */
exports.IdentificationResultSchema = zod_1.z.object({
    speakerId: zod_1.z.string(),
    speakerName: zod_1.z.string().optional(),
    confidence: zod_1.z.number().min(0).max(1),
    score: zod_1.z.number(),
    rank: zod_1.z.number().int().positive(),
    alternatives: zod_1.z.array(zod_1.z.object({
        speakerId: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1),
        score: zod_1.z.number()
    })).optional()
});
/**
 * Speaker diarization segment
 */
exports.DiarizationSegmentSchema = zod_1.z.object({
    startTime: zod_1.z.number().nonnegative(),
    endTime: zod_1.z.number().positive(),
    speakerId: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    label: zod_1.z.string().optional()
});
/**
 * Voice characteristics
 */
exports.VoiceCharacteristicsSchema = zod_1.z.object({
    fundamentalFrequency: zod_1.z.number().describe('F0 in Hz'),
    pitchRange: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]),
    speakingRate: zod_1.z.number().describe('Words per minute'),
    jitter: zod_1.z.number().describe('Pitch variation'),
    shimmer: zod_1.z.number().describe('Amplitude variation'),
    hnr: zod_1.z.number().describe('Harmonics-to-noise ratio'),
    age: zod_1.z.object({
        estimated: zod_1.z.number().int().positive(),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional(),
    gender: zod_1.z.object({
        estimated: zod_1.z.enum(['male', 'female', 'other']),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional(),
    emotion: zod_1.z.object({
        detected: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1),
        valence: zod_1.z.number().min(-1).max(1),
        arousal: zod_1.z.number().min(0).max(1)
    }).optional(),
    accent: zod_1.z.object({
        detected: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional()
});
/**
 * Deepfake detection result
 */
exports.DeepfakeDetectionResultSchema = zod_1.z.object({
    isDeepfake: zod_1.z.boolean(),
    confidence: zod_1.z.number().min(0).max(1),
    score: zod_1.z.number(),
    indicators: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        severity: zod_1.z.enum(['low', 'medium', 'high']),
        description: zod_1.z.string()
    })),
    analysisMethod: zod_1.z.string()
});
/**
 * Voice cloning detection result
 */
exports.VoiceCloningDetectionSchema = zod_1.z.object({
    isCloned: zod_1.z.boolean(),
    confidence: zod_1.z.number().min(0).max(1),
    originalSpeaker: zod_1.z.string().optional(),
    artifacts: zod_1.z.array(zod_1.z.string()),
    technicalMarkers: zod_1.z.record(zod_1.z.string(), zod_1.z.number())
});
/**
 * Speaker clustering result
 */
exports.SpeakerClusterSchema = zod_1.z.object({
    clusterId: zod_1.z.string(),
    speakerCount: zod_1.z.number().int().positive(),
    segments: zod_1.z.array(exports.DiarizationSegmentSchema),
    centroid: zod_1.z.array(zod_1.z.number()).describe('Cluster centroid embedding'),
    cohesion: zod_1.z.number().min(0).max(1)
});
/**
 * Multi-speaker separation result
 */
exports.SpeakerSeparationResultSchema = zod_1.z.object({
    speakers: zod_1.z.array(zod_1.z.object({
        speakerId: zod_1.z.string(),
        audioData: zod_1.z.instanceof(Buffer),
        segments: zod_1.z.array(exports.DiarizationSegmentSchema)
    })),
    method: zod_1.z.string(),
    quality: zod_1.z.number().min(0).max(1)
});
