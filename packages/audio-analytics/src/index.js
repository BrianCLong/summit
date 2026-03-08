"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechAnalyticsResultSchema = exports.SpeechSentimentSchema = exports.AcousticSceneSchema = exports.KeywordSpottingResultSchema = exports.VADResultSchema = exports.AudioFeaturesSchema = void 0;
const zod_1 = require("zod");
/**
 * Audio features schema
 */
exports.AudioFeaturesSchema = zod_1.z.object({
    mfcc: zod_1.z.array(zod_1.z.array(zod_1.z.number())).optional().describe('Mel-frequency cepstral coefficients'),
    spectrogram: zod_1.z.array(zod_1.z.array(zod_1.z.number())).optional(),
    melSpectrogram: zod_1.z.array(zod_1.z.array(zod_1.z.number())).optional(),
    chroma: zod_1.z.array(zod_1.z.array(zod_1.z.number())).optional(),
    spectralCentroid: zod_1.z.array(zod_1.z.number()).optional(),
    spectralRolloff: zod_1.z.array(zod_1.z.number()).optional(),
    spectralFlux: zod_1.z.array(zod_1.z.number()).optional(),
    zeroCrossingRate: zod_1.z.array(zod_1.z.number()).optional(),
    energy: zod_1.z.array(zod_1.z.number()).optional(),
    rms: zod_1.z.array(zod_1.z.number()).optional(),
    pitch: zod_1.z.array(zod_1.z.number()).optional(),
    pitchContour: zod_1.z.array(zod_1.z.number()).optional(),
    formants: zod_1.z.array(zod_1.z.array(zod_1.z.number())).optional(),
    embeddings: zod_1.z.array(zod_1.z.number()).optional().describe('Audio embedding vector'),
    prosodicFeatures: zod_1.z.object({
        speakingRate: zod_1.z.number(),
        pitchMean: zod_1.z.number(),
        pitchStd: zod_1.z.number(),
        pitchRange: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]),
        energyMean: zod_1.z.number(),
        energyStd: zod_1.z.number(),
        pauseDuration: zod_1.z.number(),
        pauseRate: zod_1.z.number()
    }).optional()
});
/**
 * VAD (Voice Activity Detection) result
 */
exports.VADResultSchema = zod_1.z.object({
    segments: zod_1.z.array(zod_1.z.object({
        startTime: zod_1.z.number(),
        endTime: zod_1.z.number(),
        confidence: zod_1.z.number().min(0).max(1),
        isSpeech: zod_1.z.boolean()
    })),
    speechRatio: zod_1.z.number().min(0).max(1).describe('Ratio of speech to total duration'),
    totalSpeechDuration: zod_1.z.number(),
    totalSilenceDuration: zod_1.z.number()
});
/**
 * Keyword spotting result
 */
exports.KeywordSpottingResultSchema = zod_1.z.object({
    keyword: zod_1.z.string(),
    detections: zod_1.z.array(zod_1.z.object({
        startTime: zod_1.z.number(),
        endTime: zod_1.z.number(),
        confidence: zod_1.z.number().min(0).max(1)
    })),
    count: zod_1.z.number().int().nonnegative()
});
/**
 * Acoustic scene classification result
 */
exports.AcousticSceneSchema = zod_1.z.object({
    scene: zod_1.z.string().describe('Detected scene type'),
    confidence: zod_1.z.number().min(0).max(1),
    alternatives: zod_1.z.array(zod_1.z.object({
        scene: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1)
    })).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional()
});
/**
 * Sentiment analysis from speech
 */
exports.SpeechSentimentSchema = zod_1.z.object({
    sentiment: zod_1.z.enum(['positive', 'negative', 'neutral', 'mixed']),
    confidence: zod_1.z.number().min(0).max(1),
    scores: zod_1.z.object({
        positive: zod_1.z.number(),
        negative: zod_1.z.number(),
        neutral: zod_1.z.number()
    }),
    valence: zod_1.z.number().min(-1).max(1),
    arousal: zod_1.z.number().min(0).max(1),
    dominance: zod_1.z.number().min(0).max(1).optional()
});
/**
 * Speech analytics
 */
exports.SpeechAnalyticsResultSchema = zod_1.z.object({
    speakingRate: zod_1.z.number().describe('Words per minute'),
    articulation: zod_1.z.number().min(0).max(1).describe('Articulation clarity score'),
    fillerWordCount: zod_1.z.number().int().nonnegative(),
    fillerWords: zod_1.z.array(zod_1.z.object({
        word: zod_1.z.string(),
        count: zod_1.z.number(),
        timestamps: zod_1.z.array(zod_1.z.number())
    })),
    pauseCount: zod_1.z.number().int().nonnegative(),
    averagePauseDuration: zod_1.z.number(),
    longestPause: zod_1.z.number(),
    intonation: zod_1.z.object({
        variety: zod_1.z.number().min(0).max(1),
        monotoneScore: zod_1.z.number().min(0).max(1)
    }),
    loudness: zod_1.z.object({
        mean: zod_1.z.number(),
        max: zod_1.z.number(),
        min: zod_1.z.number(),
        variability: zod_1.z.number()
    })
});
