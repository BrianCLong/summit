"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STTProviderFactory = exports.BaseSTTProvider = void 0;
/**
 * Base class for STT providers
 */
class BaseSTTProvider {
    config;
    constructor(config = {}) {
        this.config = config;
    }
    /**
     * Check if language is supported
     */
    supportsLanguage(language) {
        const supported = this.getProviderLanguages();
        return supported.includes(language);
    }
    /**
     * Get supported languages
     */
    getSupportedLanguages() {
        return this.getProviderLanguages();
    }
    /**
     * Get maximum audio duration (default 10 hours)
     */
    getMaxDuration() {
        return 36000;
    }
    /**
     * Validate configuration
     */
    validateConfig(config) {
        if (!this.supportsLanguage(config.language)) {
            throw new Error(`Language ${config.language} not supported by ${this.getName()}`);
        }
    }
    /**
     * Merge configurations
     */
    mergeConfig(config) {
        return {
            ...this.config,
            ...config
        };
    }
}
exports.BaseSTTProvider = BaseSTTProvider;
/**
 * Factory for creating STT providers
 */
class STTProviderFactory {
    static providers = new Map();
    /**
     * Register a provider
     */
    static register(type, factory) {
        this.providers.set(type, factory);
    }
    /**
     * Create provider instance
     */
    static create(type, config) {
        const factory = this.providers.get(type);
        if (!factory) {
            throw new Error(`Provider ${type} not registered`);
        }
        return factory();
    }
    /**
     * Get available providers
     */
    static getAvailableProviders() {
        return Array.from(this.providers.keys());
    }
}
exports.STTProviderFactory = STTProviderFactory;
