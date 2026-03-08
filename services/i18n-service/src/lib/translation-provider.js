"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationProviderFactory = exports.LocalTranslationProvider = exports.GoogleTranslationProvider = exports.MockTranslationProvider = void 0;
/**
 * Mock translation provider for testing/development
 */
class MockTranslationProvider {
    name = 'mock';
    async translate(text, sourceLanguage, targetLanguage) {
        // Return text with prefix indicating it's been "translated"
        return `[${sourceLanguage}→${targetLanguage}] ${text}`;
    }
    async translateBatch(texts, sourceLanguage, targetLanguage) {
        return Promise.all(texts.map((text) => this.translate(text, sourceLanguage, targetLanguage)));
    }
    async isAvailable() {
        return true;
    }
}
exports.MockTranslationProvider = MockTranslationProvider;
/**
 * Google Cloud Translation provider
 */
class GoogleTranslationProvider {
    name = 'google';
    client; // @google-cloud/translate client
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async initialize() {
        if (!this.apiKey) {
            throw new Error('Google Translation API key not configured');
        }
        try {
            const { v2 } = await Promise.resolve().then(() => __importStar(require('@google-cloud/translate')));
            this.client = new v2.Translate({ key: this.apiKey });
        }
        catch (error) {
            console.error('Failed to initialize Google Translation:', error);
            throw error;
        }
    }
    async translate(text, sourceLanguage, targetLanguage) {
        if (!this.client) {
            await this.initialize();
        }
        try {
            const [translation] = await this.client.translate(text, {
                from: sourceLanguage,
                to: targetLanguage,
                format: 'text',
            });
            return translation;
        }
        catch (error) {
            console.error('Google Translation error:', error);
            throw error;
        }
    }
    async translateBatch(texts, sourceLanguage, targetLanguage) {
        if (!this.client) {
            await this.initialize();
        }
        try {
            const [translations] = await this.client.translate(texts, {
                from: sourceLanguage,
                to: targetLanguage,
                format: 'text',
            });
            return Array.isArray(translations) ? translations : [translations];
        }
        catch (error) {
            console.error('Google Translation batch error:', error);
            throw error;
        }
    }
    async isAvailable() {
        return !!this.apiKey;
    }
}
exports.GoogleTranslationProvider = GoogleTranslationProvider;
/**
 * Local/passthrough provider (no translation, returns original text)
 */
class LocalTranslationProvider {
    name = 'local';
    async translate(text, _sourceLanguage, _targetLanguage) {
        return text;
    }
    async translateBatch(texts, _sourceLanguage, _targetLanguage) {
        return texts;
    }
    async isAvailable() {
        return true;
    }
}
exports.LocalTranslationProvider = LocalTranslationProvider;
/**
 * Translation provider factory
 */
class TranslationProviderFactory {
    static providers = new Map();
    static registerProvider(provider) {
        this.providers.set(provider.name, provider);
    }
    static getProvider(name) {
        return this.providers.get(name);
    }
    static async createProvider(config) {
        const { defaultProvider, googleApiKey } = config;
        switch (defaultProvider) {
            case 'google':
                if (!googleApiKey) {
                    console.warn('Google Translation API key not configured, falling back to mock');
                    return new MockTranslationProvider();
                }
                const googleProvider = new GoogleTranslationProvider(googleApiKey);
                await googleProvider.initialize();
                return googleProvider;
            case 'local':
                return new LocalTranslationProvider();
            case 'mock':
            default:
                return new MockTranslationProvider();
        }
    }
}
exports.TranslationProviderFactory = TranslationProviderFactory;
// Register default providers
TranslationProviderFactory.registerProvider(new MockTranslationProvider());
TranslationProviderFactory.registerProvider(new LocalTranslationProvider());
