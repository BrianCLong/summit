"use strict";
/**
 * Provider Registry
 *
 * Manages registration and selection of STT, diarization, and other providers.
 * Supports pluggable provider architecture with fallback mechanisms.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerRegistry = void 0;
const mock_stt_provider_js_1 = require("./stt/mock-stt-provider.js");
const mock_diarization_provider_js_1 = require("./diarization/mock-diarization-provider.js");
const logger_js_1 = require("../utils/logger.js");
const index_js_1 = __importDefault(require("../config/index.js"));
class ProviderRegistry {
    sttProviders = new Map();
    diarizationProviders = new Map();
    languageDetectionProviders = new Map();
    translationProviders = new Map();
    contentAnalysisProviders = new Map();
    initialized = false;
    /**
     * Initialize the registry with default providers
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        logger_js_1.logger.info('Initializing provider registry');
        // Register mock STT provider
        const mockSTT = new mock_stt_provider_js_1.MockSTTProvider();
        await mockSTT.initialize({
            id: 'mock-stt',
            name: 'Mock STT Provider',
            type: 'stt',
            version: '1.0.0',
            enabled: true,
            priority: 0,
        });
        this.registerSTTProvider(mockSTT);
        // Register mock diarization provider
        const mockDiarization = new mock_diarization_provider_js_1.MockDiarizationProvider();
        await mockDiarization.initialize({
            id: 'mock-diarization',
            name: 'Mock Diarization Provider',
            type: 'diarization',
            version: '1.0.0',
            enabled: true,
            priority: 0,
        });
        this.registerDiarizationProvider(mockDiarization);
        this.initialized = true;
        logger_js_1.logger.info({
            sttProviders: Array.from(this.sttProviders.keys()),
            diarizationProviders: Array.from(this.diarizationProviders.keys()),
        }, 'Provider registry initialized');
    }
    // ============================================================================
    // Registration Methods
    // ============================================================================
    registerSTTProvider(provider) {
        this.sttProviders.set(provider.id, provider);
        logger_js_1.logger.info({ providerId: provider.id }, 'Registered STT provider');
    }
    registerDiarizationProvider(provider) {
        this.diarizationProviders.set(provider.id, provider);
        logger_js_1.logger.info({ providerId: provider.id }, 'Registered diarization provider');
    }
    registerLanguageDetectionProvider(provider) {
        this.languageDetectionProviders.set(provider.id, provider);
        logger_js_1.logger.info({ providerId: provider.id }, 'Registered language detection provider');
    }
    registerTranslationProvider(provider) {
        this.translationProviders.set(provider.id, provider);
        logger_js_1.logger.info({ providerId: provider.id }, 'Registered translation provider');
    }
    registerContentAnalysisProvider(provider) {
        this.contentAnalysisProviders.set(provider.id, provider);
        logger_js_1.logger.info({ providerId: provider.id }, 'Registered content analysis provider');
    }
    // ============================================================================
    // Getter Methods
    // ============================================================================
    getSTTProvider(id) {
        return this.sttProviders.get(id);
    }
    getDiarizationProvider(id) {
        return this.diarizationProviders.get(id);
    }
    getLanguageDetectionProvider(id) {
        return this.languageDetectionProviders.get(id);
    }
    getTranslationProvider(id) {
        return this.translationProviders.get(id);
    }
    getContentAnalysisProvider(id) {
        return this.contentAnalysisProviders.get(id);
    }
    // ============================================================================
    // List Methods
    // ============================================================================
    listSTTProviders() {
        return Array.from(this.sttProviders.keys());
    }
    listDiarizationProviders() {
        return Array.from(this.diarizationProviders.keys());
    }
    // ============================================================================
    // Health Check Methods
    // ============================================================================
    async checkSTTProviderHealth(id) {
        const provider = this.sttProviders.get(id);
        if (!provider)
            return null;
        return provider.healthCheck();
    }
    async checkDiarizationProviderHealth(id) {
        const provider = this.diarizationProviders.get(id);
        if (!provider)
            return null;
        return provider.healthCheck();
    }
    async checkAllProvidersHealth() {
        const results = new Map();
        for (const [id, provider] of this.sttProviders) {
            try {
                results.set(`stt:${id}`, await provider.healthCheck());
            }
            catch (error) {
                results.set(`stt:${id}`, {
                    providerId: id,
                    status: 'unavailable',
                    lastChecked: new Date().toISOString(),
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        for (const [id, provider] of this.diarizationProviders) {
            try {
                results.set(`diarization:${id}`, await provider.healthCheck());
            }
            catch (error) {
                results.set(`diarization:${id}`, {
                    providerId: id,
                    status: 'unavailable',
                    lastChecked: new Date().toISOString(),
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        return results;
    }
    // ============================================================================
    // Provider Selection (ProviderSelector interface)
    // ============================================================================
    async selectSTTProvider(mediaAsset, preferences) {
        const format = mediaAsset.format;
        const availableProviders = [];
        // Find providers that support the format
        for (const [id, provider] of this.sttProviders) {
            if (provider.supportedFormats.includes(format)) {
                const health = await provider.healthCheck();
                if (health.status === 'available' || health.status === 'degraded') {
                    availableProviders.push(id);
                }
            }
        }
        if (availableProviders.length === 0) {
            throw new Error(`No STT providers available for format: ${format}`);
        }
        // Check if preferred provider is configured and available
        const defaultProvider = index_js_1.default.sttDefaultProvider;
        if (defaultProvider && availableProviders.includes(defaultProvider)) {
            return {
                providerId: defaultProvider,
                reason: 'Configured default provider',
                fallbacks: availableProviders.filter((id) => id !== defaultProvider),
            };
        }
        // Return first available provider
        return {
            providerId: availableProviders[0],
            reason: 'First available provider',
            fallbacks: availableProviders.slice(1),
        };
    }
    async selectDiarizationProvider(mediaAsset, preferences) {
        const format = mediaAsset.format;
        const availableProviders = [];
        for (const [id, provider] of this.diarizationProviders) {
            if (provider.supportedFormats.includes(format)) {
                const health = await provider.healthCheck();
                if (health.status === 'available' || health.status === 'degraded') {
                    availableProviders.push(id);
                }
            }
        }
        if (availableProviders.length === 0) {
            throw new Error(`No diarization providers available for format: ${format}`);
        }
        const defaultProvider = index_js_1.default.diarizationDefaultProvider;
        if (defaultProvider && availableProviders.includes(defaultProvider)) {
            return {
                providerId: defaultProvider,
                reason: 'Configured default provider',
                fallbacks: availableProviders.filter((id) => id !== defaultProvider),
            };
        }
        return {
            providerId: availableProviders[0],
            reason: 'First available provider',
            fallbacks: availableProviders.slice(1),
        };
    }
}
// Singleton instance
exports.providerRegistry = new ProviderRegistry();
exports.default = exports.providerRegistry;
