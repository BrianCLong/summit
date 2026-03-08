"use strict";
/**
 * Provider Factory and Registry
 *
 * Central registry for LLM providers with factory methods
 * for creating provider instances.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_CAPABILITIES = exports.ProviderFactory = exports.ProviderRegistry = exports.OpenAIProvider = exports.ClaudeProvider = exports.BaseLLMProvider = void 0;
const ClaudeProvider_js_1 = require("./ClaudeProvider.js");
const OpenAIProvider_js_1 = require("./OpenAIProvider.js");
var BaseLLMProvider_js_1 = require("./BaseLLMProvider.js");
Object.defineProperty(exports, "BaseLLMProvider", { enumerable: true, get: function () { return BaseLLMProvider_js_1.BaseLLMProvider; } });
var ClaudeProvider_js_2 = require("./ClaudeProvider.js");
Object.defineProperty(exports, "ClaudeProvider", { enumerable: true, get: function () { return ClaudeProvider_js_2.ClaudeProvider; } });
var OpenAIProvider_js_2 = require("./OpenAIProvider.js");
Object.defineProperty(exports, "OpenAIProvider", { enumerable: true, get: function () { return OpenAIProvider_js_2.OpenAIProvider; } });
/**
 * Provider Registry - manages provider instances
 */
class ProviderRegistry {
    providers = new Map();
    defaultProvider;
    /**
     * Register a provider instance
     */
    register(key, provider, isDefault = false) {
        this.providers.set(key, provider);
        if (isDefault || !this.defaultProvider) {
            this.defaultProvider = key;
        }
    }
    /**
     * Get a provider by key
     */
    get(key) {
        return this.providers.get(key);
    }
    /**
     * Get the default provider
     */
    getDefault() {
        return this.defaultProvider ? this.providers.get(this.defaultProvider) : undefined;
    }
    /**
     * Get provider by model
     */
    getByModel(model) {
        for (const provider of this.providers.values()) {
            if (provider.supportedModels.includes(model)) {
                return provider;
            }
        }
        return undefined;
    }
    /**
     * Get all registered providers
     */
    getAll() {
        return new Map(this.providers);
    }
    /**
     * Remove a provider
     */
    remove(key) {
        return this.providers.delete(key);
    }
    /**
     * Clear all providers
     */
    clear() {
        this.providers.clear();
        this.defaultProvider = undefined;
    }
    /**
     * Check if a provider exists
     */
    has(key) {
        return this.providers.has(key);
    }
    /**
     * Get provider count
     */
    get size() {
        return this.providers.size;
    }
}
exports.ProviderRegistry = ProviderRegistry;
/**
 * Provider Factory - creates provider instances from config
 */
class ProviderFactory {
    /**
     * Create a provider from configuration
     */
    static create(config) {
        switch (config.provider) {
            case 'claude':
                return new ClaudeProvider_js_1.ClaudeProvider(config);
            case 'gpt':
            case 'o1':
                return new OpenAIProvider_js_1.OpenAIProvider(config);
            case 'local':
                throw new Error('Local provider not yet implemented');
            default:
                throw new Error(`Unknown provider: ${config.provider}`);
        }
    }
    /**
     * Create default provider configurations
     */
    static createDefaultConfigs() {
        return [
            {
                provider: 'claude',
                model: 'claude-3-5-sonnet-20241022',
                maxTokens: 4096,
                temperature: 0.7,
                timeout: 60000,
                retries: 3,
            },
            {
                provider: 'gpt',
                model: 'gpt-4o',
                maxTokens: 4096,
                temperature: 0.7,
                timeout: 60000,
                retries: 3,
            },
            {
                provider: 'o1',
                model: 'o1-preview',
                maxTokens: 32768,
                temperature: 1, // o1 doesn't support temperature
                timeout: 120000, // o1 needs longer timeout
                retries: 2,
            },
        ];
    }
    /**
     * Create a registry with default providers
     */
    static createDefaultRegistry() {
        const registry = new ProviderRegistry();
        const configs = this.createDefaultConfigs();
        for (const config of configs) {
            try {
                const provider = this.create(config);
                registry.register(`${config.provider}-${config.model}`, provider, config.provider === 'claude');
            }
            catch {
                // Skip providers that fail to initialize
            }
        }
        return registry;
    }
}
exports.ProviderFactory = ProviderFactory;
/**
 * Model capabilities and metadata
 */
exports.MODEL_CAPABILITIES = {
    'claude-3-5-sonnet-20241022': {
        provider: 'claude',
        maxContextTokens: 200000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsStreaming: true,
        supportsVision: true,
        strengths: ['coding', 'analysis', 'reasoning', 'creativity', 'safety'],
    },
    'claude-3-opus-20240229': {
        provider: 'claude',
        maxContextTokens: 200000,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsStreaming: true,
        supportsVision: true,
        strengths: ['complex-reasoning', 'nuanced-analysis', 'writing'],
    },
    'claude-3-haiku-20240307': {
        provider: 'claude',
        maxContextTokens: 200000,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsStreaming: true,
        supportsVision: true,
        strengths: ['speed', 'cost-efficiency', 'simple-tasks'],
    },
    'gpt-4-turbo': {
        provider: 'gpt',
        maxContextTokens: 128000,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsStreaming: true,
        supportsVision: true,
        strengths: ['general-purpose', 'coding', 'analysis'],
    },
    'gpt-4o': {
        provider: 'gpt',
        maxContextTokens: 128000,
        maxOutputTokens: 16384,
        supportsTools: true,
        supportsStreaming: true,
        supportsVision: true,
        strengths: ['multimodal', 'speed', 'general-purpose'],
    },
    'gpt-4o-mini': {
        provider: 'gpt',
        maxContextTokens: 128000,
        maxOutputTokens: 16384,
        supportsTools: true,
        supportsStreaming: true,
        supportsVision: true,
        strengths: ['cost-efficiency', 'speed', 'simple-tasks'],
    },
    'o1-preview': {
        provider: 'o1',
        maxContextTokens: 128000,
        maxOutputTokens: 32768,
        supportsTools: false,
        supportsStreaming: false,
        supportsVision: false,
        strengths: ['deep-reasoning', 'math', 'science', 'complex-problems'],
    },
    'o1-mini': {
        provider: 'o1',
        maxContextTokens: 128000,
        maxOutputTokens: 65536,
        supportsTools: false,
        supportsStreaming: false,
        supportsVision: false,
        strengths: ['reasoning', 'coding', 'cost-efficiency'],
    },
    'local-llama': {
        provider: 'local',
        maxContextTokens: 4096,
        maxOutputTokens: 2048,
        supportsTools: false,
        supportsStreaming: true,
        supportsVision: false,
        strengths: ['privacy', 'offline', 'cost-free'],
    },
};
