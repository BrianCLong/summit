"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhisperProvider = void 0;
const base_js_1 = require("./base.js");
const types_js_1 = require("../types.js");
const axios_1 = __importDefault(require("axios"));
/**
 * Whisper STT Provider
 * Supports OpenAI Whisper models for high-accuracy transcription
 */
class WhisperProvider extends base_js_1.BaseSTTProvider {
    apiKey;
    endpoint;
    model;
    constructor(config = {}) {
        super(config);
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
        this.endpoint = config.endpoint || 'https://api.openai.com/v1/audio/transcriptions';
        this.model = config.model || 'large-v3';
    }
    getName() {
        return 'Whisper';
    }
    async transcribe(audio, config) {
        this.validateConfig(config);
        const mergedConfig = this.mergeConfig(config);
        try {
            // Prepare form data
            const formData = new FormData();
            const blob = new Blob([audio.data], { type: 'audio/wav' });
            formData.append('file', blob, 'audio.wav');
            formData.append('model', this.model);
            formData.append('language', mergedConfig.language.split('-')[0]); // Whisper uses 2-letter codes
            formData.append('response_format', 'verbose_json');
            if (mergedConfig.enableWordTimestamps) {
                formData.append('timestamp_granularities', 'word');
            }
            if (mergedConfig.temperature !== undefined) {
                formData.append('temperature', String(mergedConfig.temperature));
            }
            // Make API request
            const response = await axios_1.default.post(this.endpoint, formData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            // Transform Whisper response to our format
            return this.transformWhisperResponse(response.data, mergedConfig);
        }
        catch (error) {
            throw new Error(`Whisper transcription failed: ${error}`);
        }
    }
    getProviderLanguages() {
        // Whisper supports 100+ languages
        return Array.from(types_js_1.SUPPORTED_LANGUAGES);
    }
    getMaxDuration() {
        // Whisper API has a 25MB file size limit
        return 3600; // ~1 hour of audio
    }
    transformWhisperResponse(response, config) {
        const segments = (response.segments || []).map((seg) => ({
            text: seg.text,
            startTime: seg.start,
            endTime: seg.end,
            confidence: seg.confidence || 1.0,
            words: seg.words?.map((word) => ({
                word: word.word,
                startTime: word.start,
                endTime: word.end,
                confidence: word.probability || 1.0
            }))
        }));
        return {
            text: response.text,
            segments,
            language: response.language || config.language,
            languageConfidence: 1.0,
            duration: response.duration,
            provider: types_js_1.STTProvider.WHISPER,
            model: this.model,
            metadata: {
                task: response.task,
                temperature: response.temperature
            }
        };
    }
}
exports.WhisperProvider = WhisperProvider;
