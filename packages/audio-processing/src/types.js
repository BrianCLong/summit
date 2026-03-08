"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioEnhancementError = exports.AudioStreamError = exports.AudioFormatError = exports.AudioProcessingError = exports.AudioEnhancementOptionsSchema = exports.AudioQualityMetricsSchema = exports.AudioSegmentSchema = exports.AudioProcessingJobSchema = exports.JobStatus = exports.AudioStreamConfigSchema = exports.AudioBufferSchema = exports.AudioMetadataSchema = exports.ChannelConfig = exports.SampleRate = exports.AudioCodec = exports.AudioFormat = void 0;
const zod_1 = require("zod");
/**
 * Audio format specifications
 */
var AudioFormat;
(function (AudioFormat) {
    AudioFormat["WAV"] = "wav";
    AudioFormat["MP3"] = "mp3";
    AudioFormat["FLAC"] = "flac";
    AudioFormat["OGG"] = "ogg";
    AudioFormat["OPUS"] = "opus";
    AudioFormat["M4A"] = "m4a";
    AudioFormat["AAC"] = "aac";
    AudioFormat["PCM"] = "pcm";
    AudioFormat["RAW"] = "raw";
})(AudioFormat || (exports.AudioFormat = AudioFormat = {}));
/**
 * Audio codec types
 */
var AudioCodec;
(function (AudioCodec) {
    AudioCodec["PCM"] = "pcm";
    AudioCodec["OPUS"] = "opus";
    AudioCodec["G711_ULAW"] = "g711-ulaw";
    AudioCodec["G711_ALAW"] = "g711-alaw";
    AudioCodec["AAC"] = "aac";
    AudioCodec["MP3"] = "mp3";
    AudioCodec["FLAC"] = "flac";
    AudioCodec["VORBIS"] = "vorbis";
})(AudioCodec || (exports.AudioCodec = AudioCodec = {}));
/**
 * Sample rate in Hz
 */
var SampleRate;
(function (SampleRate) {
    SampleRate[SampleRate["Hz8000"] = 8000] = "Hz8000";
    SampleRate[SampleRate["Hz11025"] = 11025] = "Hz11025";
    SampleRate[SampleRate["Hz16000"] = 16000] = "Hz16000";
    SampleRate[SampleRate["Hz22050"] = 22050] = "Hz22050";
    SampleRate[SampleRate["Hz32000"] = 32000] = "Hz32000";
    SampleRate[SampleRate["Hz44100"] = 44100] = "Hz44100";
    SampleRate[SampleRate["Hz48000"] = 48000] = "Hz48000";
    SampleRate[SampleRate["Hz96000"] = 96000] = "Hz96000";
})(SampleRate || (exports.SampleRate = SampleRate = {}));
/**
 * Audio channel configuration
 */
var ChannelConfig;
(function (ChannelConfig) {
    ChannelConfig[ChannelConfig["MONO"] = 1] = "MONO";
    ChannelConfig[ChannelConfig["STEREO"] = 2] = "STEREO";
    ChannelConfig[ChannelConfig["SURROUND_5_1"] = 6] = "SURROUND_5_1";
    ChannelConfig[ChannelConfig["SURROUND_7_1"] = 8] = "SURROUND_7_1";
})(ChannelConfig || (exports.ChannelConfig = ChannelConfig = {}));
/**
 * Audio metadata schema
 */
exports.AudioMetadataSchema = zod_1.z.object({
    duration: zod_1.z.number().positive().describe('Duration in seconds'),
    sampleRate: zod_1.z.number().positive().describe('Sample rate in Hz'),
    channels: zod_1.z.number().int().positive().describe('Number of channels'),
    bitDepth: zod_1.z.number().int().positive().optional().describe('Bit depth (8, 16, 24, 32)'),
    bitrate: zod_1.z.number().positive().optional().describe('Bitrate in kbps'),
    codec: zod_1.z.nativeEnum(AudioCodec).describe('Audio codec'),
    format: zod_1.z.nativeEnum(AudioFormat).describe('Audio format'),
    fileSize: zod_1.z.number().positive().optional().describe('File size in bytes'),
    checksum: zod_1.z.string().optional().describe('MD5 or SHA256 checksum')
});
/**
 * Audio buffer representation
 */
exports.AudioBufferSchema = zod_1.z.object({
    data: zod_1.z.instanceof(Buffer).or(zod_1.z.instanceof(Uint8Array)).describe('Audio data buffer'),
    metadata: exports.AudioMetadataSchema,
    timestamp: zod_1.z.date().optional().describe('Capture timestamp'),
    source: zod_1.z.string().optional().describe('Audio source identifier')
});
/**
 * Audio stream configuration
 */
exports.AudioStreamConfigSchema = zod_1.z.object({
    sampleRate: zod_1.z.nativeEnum(SampleRate),
    channels: zod_1.z.nativeEnum(ChannelConfig),
    codec: zod_1.z.nativeEnum(AudioCodec),
    bitrate: zod_1.z.number().positive().optional(),
    chunkSize: zod_1.z.number().int().positive().optional().describe('Chunk size in samples'),
    enableVAD: zod_1.z.boolean().optional().describe('Enable voice activity detection'),
    enableNoiseReduction: zod_1.z.boolean().optional()
});
/**
 * Audio processing job status
 */
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "pending";
    JobStatus["PROCESSING"] = "processing";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["FAILED"] = "failed";
    JobStatus["CANCELLED"] = "cancelled";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
/**
 * Audio processing job
 */
exports.AudioProcessingJobSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.string().describe('Job type (transcription, analysis, etc.)'),
    status: zod_1.z.nativeEnum(JobStatus),
    audioSource: zod_1.z.string().describe('Audio source URL or path'),
    config: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    result: zod_1.z.unknown().optional(),
    error: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    completedAt: zod_1.z.date().optional()
});
/**
 * Audio segment for processing
 */
exports.AudioSegmentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    startTime: zod_1.z.number().nonnegative().describe('Start time in seconds'),
    endTime: zod_1.z.number().positive().describe('End time in seconds'),
    data: zod_1.z.instanceof(Buffer).or(zod_1.z.instanceof(Uint8Array)),
    metadata: exports.AudioMetadataSchema.optional(),
    label: zod_1.z.string().optional().describe('Segment label or classification')
});
/**
 * Audio quality metrics
 */
exports.AudioQualityMetricsSchema = zod_1.z.object({
    snr: zod_1.z.number().optional().describe('Signal-to-noise ratio in dB'),
    thd: zod_1.z.number().optional().describe('Total harmonic distortion'),
    pesq: zod_1.z.number().optional().describe('Perceptual Evaluation of Speech Quality'),
    polqa: zod_1.z.number().optional().describe('Perceptual Objective Listening Quality Assessment'),
    clipRate: zod_1.z.number().optional().describe('Clipping rate percentage'),
    dynamicRange: zod_1.z.number().optional().describe('Dynamic range in dB'),
    loudness: zod_1.z.number().optional().describe('Integrated loudness in LUFS')
});
/**
 * Processing options for audio enhancement
 */
exports.AudioEnhancementOptionsSchema = zod_1.z.object({
    noiseReduction: zod_1.z.boolean().default(false),
    noiseReductionLevel: zod_1.z.number().min(0).max(1).default(0.5),
    echoCancellation: zod_1.z.boolean().default(false),
    reverbRemoval: zod_1.z.boolean().default(false),
    normalization: zod_1.z.boolean().default(false),
    targetLoudness: zod_1.z.number().optional().describe('Target loudness in LUFS'),
    bandwidthExtension: zod_1.z.boolean().default(false),
    superResolution: zod_1.z.boolean().default(false)
});
/**
 * Error types for audio processing
 */
class AudioProcessingError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'AudioProcessingError';
    }
}
exports.AudioProcessingError = AudioProcessingError;
class AudioFormatError extends AudioProcessingError {
    constructor(message, details) {
        super(message, 'AUDIO_FORMAT_ERROR', details);
        this.name = 'AudioFormatError';
    }
}
exports.AudioFormatError = AudioFormatError;
class AudioStreamError extends AudioProcessingError {
    constructor(message, details) {
        super(message, 'AUDIO_STREAM_ERROR', details);
        this.name = 'AudioStreamError';
    }
}
exports.AudioStreamError = AudioStreamError;
class AudioEnhancementError extends AudioProcessingError {
    constructor(message, details) {
        super(message, 'AUDIO_ENHANCEMENT_ERROR', details);
        this.name = 'AudioEnhancementError';
    }
}
exports.AudioEnhancementError = AudioEnhancementError;
