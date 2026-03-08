"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioTooLongError = exports.LanguageNotSupportedError = exports.ProviderError = exports.TranscriptionError = exports.SUPPORTED_LANGUAGES = exports.LanguageDetectionResultSchema = exports.StreamingRecognitionConfigSchema = exports.STTConfigSchema = exports.TranscriptionResultSchema = exports.TranscriptionSegmentSchema = exports.SpeakerInfoSchema = exports.TranscriptionWordSchema = exports.WhisperModel = exports.STTProvider = void 0;
const zod_1 = require("zod");
/**
 * Speech recognition provider
 */
var STTProvider;
(function (STTProvider) {
    STTProvider["WHISPER"] = "whisper";
    STTProvider["GOOGLE"] = "google";
    STTProvider["AWS"] = "aws";
    STTProvider["AZURE"] = "azure";
    STTProvider["CUSTOM"] = "custom";
})(STTProvider || (exports.STTProvider = STTProvider = {}));
/**
 * Whisper model size
 */
var WhisperModel;
(function (WhisperModel) {
    WhisperModel["TINY"] = "tiny";
    WhisperModel["BASE"] = "base";
    WhisperModel["SMALL"] = "small";
    WhisperModel["MEDIUM"] = "medium";
    WhisperModel["LARGE"] = "large";
    WhisperModel["LARGE_V2"] = "large-v2";
    WhisperModel["LARGE_V3"] = "large-v3";
})(WhisperModel || (exports.WhisperModel = WhisperModel = {}));
/**
 * Transcription word with timing
 */
exports.TranscriptionWordSchema = zod_1.z.object({
    word: zod_1.z.string(),
    startTime: zod_1.z.number().nonnegative(),
    endTime: zod_1.z.number().positive(),
    confidence: zod_1.z.number().min(0).max(1)
});
/**
 * Speaker information for diarization
 */
exports.SpeakerInfoSchema = zod_1.z.object({
    speakerId: zod_1.z.string(),
    speakerTag: zod_1.z.string().optional(),
    speakerName: zod_1.z.string().optional(),
    confidence: zod_1.z.number().min(0).max(1).optional()
});
/**
 * Transcription segment
 */
exports.TranscriptionSegmentSchema = zod_1.z.object({
    text: zod_1.z.string(),
    startTime: zod_1.z.number().nonnegative(),
    endTime: zod_1.z.number().positive(),
    confidence: zod_1.z.number().min(0).max(1),
    words: zod_1.z.array(exports.TranscriptionWordSchema).optional(),
    speaker: exports.SpeakerInfoSchema.optional(),
    language: zod_1.z.string().optional(),
    languageConfidence: zod_1.z.number().min(0).max(1).optional()
});
/**
 * Complete transcription result
 */
exports.TranscriptionResultSchema = zod_1.z.object({
    text: zod_1.z.string().describe('Full transcription text'),
    segments: zod_1.z.array(exports.TranscriptionSegmentSchema),
    language: zod_1.z.string().describe('Detected language code'),
    languageConfidence: zod_1.z.number().min(0).max(1).optional(),
    duration: zod_1.z.number().positive(),
    provider: zod_1.z.nativeEnum(STTProvider),
    model: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional()
});
/**
 * STT configuration
 */
exports.STTConfigSchema = zod_1.z.object({
    provider: zod_1.z.nativeEnum(STTProvider),
    language: zod_1.z.string().default('en-US').describe('Language code (BCP-47)'),
    alternativeLanguages: zod_1.z.array(zod_1.z.string()).optional(),
    enableAutomaticPunctuation: zod_1.z.boolean().default(true),
    enableWordTimestamps: zod_1.z.boolean().default(true),
    enableSpeakerDiarization: zod_1.z.boolean().default(false),
    maxSpeakers: zod_1.z.number().int().positive().optional(),
    minSpeakers: zod_1.z.number().int().positive().optional(),
    profanityFilter: zod_1.z.boolean().default(false),
    customVocabulary: zod_1.z.array(zod_1.z.string()).optional(),
    vocabularyFilterName: zod_1.z.string().optional(),
    model: zod_1.z.string().optional(),
    temperature: zod_1.z.number().min(0).max(1).optional(),
    apiKey: zod_1.z.string().optional(),
    region: zod_1.z.string().optional(),
    endpoint: zod_1.z.string().url().optional()
});
/**
 * Streaming recognition configuration
 */
exports.StreamingRecognitionConfigSchema = exports.STTConfigSchema.extend({
    interimResults: zod_1.z.boolean().default(true),
    singleUtterance: zod_1.z.boolean().default(false),
    vadEnabled: zod_1.z.boolean().default(true),
    silenceTimeout: zod_1.z.number().positive().optional().describe('Silence timeout in ms')
});
/**
 * Language detection result
 */
exports.LanguageDetectionResultSchema = zod_1.z.object({
    language: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    alternativeLanguages: zod_1.z.array(zod_1.z.object({
        language: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1)
    })).optional()
});
/**
 * Supported languages list
 */
exports.SUPPORTED_LANGUAGES = [
    'en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'pt-PT',
    'ru-RU', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'ar-SA', 'hi-IN', 'nl-NL', 'pl-PL',
    'sv-SE', 'no-NO', 'da-DK', 'fi-FI', 'tr-TR', 'el-GR', 'he-IL', 'th-TH', 'vi-VN',
    'id-ID', 'ms-MY', 'fil-PH', 'uk-UA', 'cs-CZ', 'ro-RO', 'hu-HU', 'bg-BG', 'hr-HR',
    'sk-SK', 'sl-SI', 'sr-RS', 'ca-ES', 'fa-IR', 'ur-PK', 'bn-IN', 'ta-IN', 'te-IN',
    'ml-IN', 'kn-IN', 'gu-IN', 'mr-IN', 'pa-IN', 'af-ZA', 'sw-KE', 'am-ET', 'my-MM',
    'km-KH', 'lo-LA', 'si-LK', 'ne-NP', 'ka-GE', 'hy-AM', 'az-AZ', 'uz-UZ', 'kk-KZ'
];
/**
 * Transcription error types
 */
class TranscriptionError extends Error {
    code;
    provider;
    details;
    constructor(message, code, provider, details) {
        super(message);
        this.code = code;
        this.provider = provider;
        this.details = details;
        this.name = 'TranscriptionError';
    }
}
exports.TranscriptionError = TranscriptionError;
class ProviderError extends TranscriptionError {
    constructor(provider, message, details) {
        super(message, 'PROVIDER_ERROR', provider, details);
        this.name = 'ProviderError';
    }
}
exports.ProviderError = ProviderError;
class LanguageNotSupportedError extends TranscriptionError {
    constructor(language, provider) {
        super(`Language ${language} is not supported by provider ${provider}`, 'LANGUAGE_NOT_SUPPORTED', provider, { language });
        this.name = 'LanguageNotSupportedError';
    }
}
exports.LanguageNotSupportedError = LanguageNotSupportedError;
class AudioTooLongError extends TranscriptionError {
    constructor(duration, maxDuration, provider) {
        super(`Audio duration ${duration}s exceeds maximum ${maxDuration}s for provider ${provider}`, 'AUDIO_TOO_LONG', provider, { duration, maxDuration });
        this.name = 'AudioTooLongError';
    }
}
exports.AudioTooLongError = AudioTooLongError;
