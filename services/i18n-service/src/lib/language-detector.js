"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageDetector = void 0;
exports.getLanguageDetector = getLanguageDetector;
exports.detectLanguage = detectLanguage;
const franc_1 = require("franc");
const supported_languages_js_1 = require("../config/supported-languages.js");
/**
 * Language detection service using franc library
 */
class LanguageDetector {
    config;
    constructor(config = {}) {
        this.config = {
            minConfidence: config.minConfidence || 0.6,
            defaultLanguage: config.defaultLanguage || 'en',
            minTextLength: config.minTextLength || 10,
            returnAlternatives: config.returnAlternatives ?? true,
        };
    }
    /**
     * Detect language from text
     */
    async detect(text) {
        // Validate input
        if (!text || text.trim().length === 0) {
            return this.createFallbackResult();
        }
        // Check minimum length
        if (text.trim().length < this.config.minTextLength) {
            return this.createFallbackResult();
        }
        try {
            // Detect using franc (returns ISO 639-3 code)
            const detected = (0, franc_1.franc)(text, {
                minLength: this.config.minTextLength,
                only: this.getSupportedLanguages(),
            });
            // Handle unknown language
            if (detected === 'und') {
                return this.createFallbackResult();
            }
            // Convert ISO 639-3 to ISO 639-1
            const language = this.convertToISO6391(detected);
            if (!language) {
                return this.createFallbackResult();
            }
            // Calculate confidence (franc doesn't provide confidence, so we estimate)
            const confidence = this.estimateConfidence(text, language);
            // Check confidence threshold
            if (confidence < this.config.minConfidence) {
                return this.createFallbackResult();
            }
            // Get alternatives if requested
            const alternatives = this.config.returnAlternatives
                ? await this.getAlternatives(text, language)
                : undefined;
            return {
                language,
                confidence,
                alternatives,
            };
        }
        catch (error) {
            console.error('Language detection error:', error);
            return this.createFallbackResult();
        }
    }
    /**
     * Batch detect languages from multiple texts
     */
    async detectBatch(texts) {
        return Promise.all(texts.map((text) => this.detect(text)));
    }
    /**
     * Create fallback result using default language
     */
    createFallbackResult() {
        return {
            language: this.config.defaultLanguage,
            confidence: 0.5,
            alternatives: [],
        };
    }
    /**
     * Get supported languages in ISO 639-3 format for franc
     */
    getSupportedLanguages() {
        // franc uses ISO 639-3 codes
        // We'll let it detect all languages and filter later
        return [];
    }
    /**
     * Convert ISO 639-3 code to ISO 639-1
     */
    convertToISO6391(iso639_3) {
        try {
            // franc returns ISO 639-3, we need ISO 639-1
            // Common mappings
            const mappings = {
                eng: 'en',
                fra: 'fr',
                deu: 'de',
                spa: 'es',
                ita: 'it',
                por: 'pt',
                nld: 'nl',
                dan: 'da',
                nor: 'no',
                swe: 'sv',
                fin: 'fi',
                isl: 'is',
                pol: 'pl',
                ces: 'cs',
                slk: 'sk',
                hun: 'hu',
                ron: 'ro',
                bul: 'bg',
                hrv: 'hr',
                slv: 'sl',
                est: 'et',
                lav: 'lv',
                lit: 'lt',
                mlt: 'mt',
                tur: 'tr',
                ell: 'el',
                mkd: 'mk',
                sqi: 'sq',
                srp: 'sr',
                ara: 'ar',
                heb: 'he',
                fas: 'fa',
                urd: 'ur',
                zho: 'zh',
                jpn: 'ja',
                kor: 'ko',
                vie: 'vi',
                tha: 'th',
                ind: 'id',
                msa: 'ms',
                hin: 'hi',
                ben: 'bn',
                tam: 'ta',
                tel: 'te',
                rus: 'ru',
                ukr: 'uk',
                bel: 'be',
                kat: 'ka',
                hye: 'hy',
                aze: 'az',
                kaz: 'kk',
                uzb: 'uz',
            };
            const iso6391 = mappings[iso639_3];
            if (iso6391 && (0, supported_languages_js_1.isLanguageSupported)(iso6391)) {
                return iso6391;
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Estimate confidence score
     */
    estimateConfidence(text, language) {
        // Simple heuristic based on text length
        // Longer text = more confident
        const length = text.trim().length;
        if (length < 20)
            return 0.6;
        if (length < 50)
            return 0.7;
        if (length < 100)
            return 0.8;
        if (length < 500)
            return 0.9;
        return 0.95;
    }
    /**
     * Get alternative language detections
     */
    async getAlternatives(text, primaryLanguage) {
        // For now, return empty alternatives
        // In a real implementation, we could use franc.all() to get all possibilities
        return [];
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
}
exports.LanguageDetector = LanguageDetector;
/**
 * Singleton instance
 */
let detectorInstance = null;
/**
 * Get language detector instance
 */
function getLanguageDetector(config) {
    if (!detectorInstance) {
        detectorInstance = new LanguageDetector(config);
    }
    else if (config) {
        detectorInstance.updateConfig(config);
    }
    return detectorInstance;
}
/**
 * Quick detect helper
 */
async function detectLanguage(text, config) {
    const detector = getLanguageDetector(config);
    return detector.detect(text);
}
