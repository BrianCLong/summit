"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleSTTProvider = void 0;
const base_js_1 = require("./base.js");
const types_js_1 = require("../types.js");
/**
 * Google Cloud Speech-to-Text Provider
 * Requires: @google-cloud/speech package
 */
class GoogleSTTProvider extends base_js_1.BaseSTTProvider {
    client;
    constructor(config = {}) {
        super(config);
        // Lazy load the Google Cloud Speech client
        // this.initializeClient(config);
    }
    getName() {
        return 'Google Cloud Speech-to-Text';
    }
    async transcribe(audio, config) {
        this.validateConfig(config);
        const mergedConfig = this.mergeConfig(config);
        try {
            // Prepare Google Cloud Speech request
            const request = {
                audio: {
                    content: audio.data.toString('base64')
                },
                config: {
                    encoding: this.getGoogleEncoding(audio.metadata.codec),
                    sampleRateHertz: audio.metadata.sampleRate,
                    languageCode: mergedConfig.language,
                    alternativeLanguageCodes: mergedConfig.alternativeLanguages,
                    enableAutomaticPunctuation: mergedConfig.enableAutomaticPunctuation,
                    enableWordTimeOffsets: mergedConfig.enableWordTimestamps,
                    enableSpeakerDiarization: mergedConfig.enableSpeakerDiarization,
                    diarizationSpeakerCount: mergedConfig.maxSpeakers,
                    profanityFilter: mergedConfig.profanityFilter,
                    model: mergedConfig.model || 'latest_long'
                }
            };
            // Add custom vocabulary if provided
            if (mergedConfig.customVocabulary && mergedConfig.customVocabulary.length > 0) {
                request.config.speechContexts = [{
                        phrases: mergedConfig.customVocabulary,
                        boost: 20
                    }];
            }
            // Make recognition request
            // const [response] = await this.client.recognize(request);
            // For now, return a placeholder
            // In production, this would use actual Google Cloud Speech API
            return this.transformGoogleResponse({}, mergedConfig, audio);
        }
        catch (error) {
            throw new Error(`Google Speech-to-Text failed: ${error}`);
        }
    }
    getProviderLanguages() {
        // Google supports 125+ languages
        return Array.from(types_js_1.SUPPORTED_LANGUAGES);
    }
    getMaxDuration() {
        // Google Cloud Speech async API supports up to 480 minutes
        return 28800;
    }
    getGoogleEncoding(codec) {
        const encodingMap = {
            'pcm': 'LINEAR16',
            'flac': 'FLAC',
            'opus': 'OGG_OPUS',
            'mp3': 'MP3'
        };
        return encodingMap[codec] || 'LINEAR16';
    }
    transformGoogleResponse(response, config, audio) {
        // Transform Google response to our format
        const results = response.results || [];
        const segments = results.map((result, index) => {
            const alternative = result.alternatives[0];
            return {
                text: alternative.transcript,
                startTime: alternative.words?.[0]?.startTime?.seconds || 0,
                endTime: alternative.words?.[alternative.words.length - 1]?.endTime?.seconds || audio.metadata.duration,
                confidence: alternative.confidence || 1.0,
                words: alternative.words?.map((word) => ({
                    word: word.word,
                    startTime: word.startTime.seconds + (word.startTime.nanos / 1e9),
                    endTime: word.endTime.seconds + (word.endTime.nanos / 1e9),
                    confidence: word.confidence || 1.0
                }))
            };
        });
        const fullText = segments.map(seg => seg.text).join(' ');
        return {
            text: fullText,
            segments,
            language: config.language,
            languageConfidence: 1.0,
            duration: audio.metadata.duration,
            provider: types_js_1.STTProvider.GOOGLE,
            model: config.model,
            metadata: {
                totalBilledTime: response.totalBilledTime
            }
        };
    }
}
exports.GoogleSTTProvider = GoogleSTTProvider;
