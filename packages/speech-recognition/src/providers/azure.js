"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureSTTProvider = void 0;
const base_js_1 = require("./base.js");
const types_js_1 = require("../types.js");
/**
 * Azure Speech Services Provider
 * Requires: microsoft-cognitiveservices-speech-sdk package
 */
class AzureSTTProvider extends base_js_1.BaseSTTProvider {
    subscriptionKey;
    region;
    speechConfig;
    constructor(config = {}) {
        super(config);
        this.subscriptionKey = config.subscriptionKey || process.env.AZURE_SPEECH_KEY;
        this.region = config.region || process.env.AZURE_SPEECH_REGION || 'eastus';
        // Lazy load Azure Speech SDK
        // this.initializeSpeechConfig();
    }
    getName() {
        return 'Azure Speech Services';
    }
    async transcribe(audio, config) {
        this.validateConfig(config);
        const mergedConfig = this.mergeConfig(config);
        try {
            // Initialize speech config
            // const speechConfig = sdk.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
            // speechConfig.speechRecognitionLanguage = mergedConfig.language;
            // Configure recognition settings
            // if (mergedConfig.enableAutomaticPunctuation) {
            //   speechConfig.enableDictation();
            // }
            // if (mergedConfig.profanityFilter) {
            //   speechConfig.setProfanity(sdk.ProfanityOption.Masked);
            // }
            // Create audio config from buffer
            // const audioConfig = sdk.AudioConfig.fromWavFileInput(audio.data);
            // Create recognizer
            // const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
            // For now, return placeholder
            return this.transformAzureResponse({}, mergedConfig, audio);
        }
        catch (error) {
            throw new Error(`Azure Speech Services failed: ${error}`);
        }
    }
    getProviderLanguages() {
        // Azure supports 100+ languages
        return Array.from(types_js_1.SUPPORTED_LANGUAGES);
    }
    getMaxDuration() {
        // Azure supports up to 10 minutes for standard recognition
        // Batch transcription supports longer audio
        return 600;
    }
    transformAzureResponse(response, config, audio) {
        // Transform Azure response to our format
        const segments = (response.results || []).map((result, index) => ({
            text: result.text,
            startTime: result.offset / 10000000, // Azure uses 100-nanosecond units
            endTime: (result.offset + result.duration) / 10000000,
            confidence: result.confidence || 1.0,
            words: result.words?.map((word) => ({
                word: word.text,
                startTime: word.offset / 10000000,
                endTime: (word.offset + word.duration) / 10000000,
                confidence: word.confidence || 1.0
            }))
        }));
        const fullText = segments.map(seg => seg.text).join(' ');
        return {
            text: fullText,
            segments,
            language: config.language,
            languageConfidence: 1.0,
            duration: audio.metadata.duration,
            provider: types_js_1.STTProvider.AZURE,
            model: 'azure-speech',
            metadata: {
                recognitionId: response.recognitionId
            }
        };
    }
}
exports.AzureSTTProvider = AzureSTTProvider;
