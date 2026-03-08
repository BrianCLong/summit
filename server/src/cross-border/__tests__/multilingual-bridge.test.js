"use strict";
/**
 * Unit tests for Multilingual Bridge
 */
Object.defineProperty(exports, "__esModule", { value: true });
const multilingual_bridge_js_1 = require("../multilingual-bridge.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('MultilingualBridge', () => {
    let bridge;
    (0, globals_1.beforeEach)(() => {
        bridge = new multilingual_bridge_js_1.MultilingualBridge();
    });
    (0, globals_1.describe)('language detection', () => {
        (0, globals_1.it)('should detect Estonian text', async () => {
            const result = await bridge.detectLanguage('Tere, kuidas läheb? Õnnitleme teid!');
            (0, globals_1.expect)(result.language).toBe('et');
            (0, globals_1.expect)(result.confidence).toBeGreaterThan(0.5);
        });
        (0, globals_1.it)('should detect English text', async () => {
            const result = await bridge.detectLanguage('Hello, how are you? The weather is nice today.');
            (0, globals_1.expect)(result.language).toBe('en');
            (0, globals_1.expect)(result.confidence).toBeGreaterThan(0.5);
        });
        (0, globals_1.it)('should detect Russian text', async () => {
            const result = await bridge.detectLanguage('Привет, как дела? Сегодня хорошая погода.');
            (0, globals_1.expect)(result.language).toBe('ru');
            (0, globals_1.expect)(result.confidence).toBeGreaterThan(0.5);
        });
        (0, globals_1.it)('should detect Finnish text', async () => {
            const result = await bridge.detectLanguage('Hyvää päivää! Miten menee?');
            (0, globals_1.expect)(result.language).toBe('fi');
            (0, globals_1.expect)(result.confidence).toBeGreaterThan(0.3);
        });
        (0, globals_1.it)('should detect German text', async () => {
            const result = await bridge.detectLanguage('Guten Tag! Wie geht es Ihnen? Die Straße ist schön.');
            (0, globals_1.expect)(result.language).toBe('de');
            (0, globals_1.expect)(result.confidence).toBeGreaterThan(0.3);
        });
        (0, globals_1.it)('should provide alternatives', async () => {
            const result = await bridge.detectLanguage('Hello world');
            (0, globals_1.expect)(result.alternatives).toBeDefined();
            (0, globals_1.expect)(Array.isArray(result.alternatives)).toBe(true);
        });
        (0, globals_1.it)('should default to English for ambiguous text', async () => {
            const result = await bridge.detectLanguage('OK');
            (0, globals_1.expect)(result.language).toBe('en');
        });
    });
    (0, globals_1.describe)('supported languages', () => {
        (0, globals_1.it)('should return list of supported languages', () => {
            const languages = bridge.getSupportedLanguages();
            (0, globals_1.expect)(languages).toContain('en');
            (0, globals_1.expect)(languages).toContain('et');
            (0, globals_1.expect)(languages).toContain('fi');
            (0, globals_1.expect)(languages).toContain('de');
            (0, globals_1.expect)(languages.length).toBeGreaterThan(10);
        });
        (0, globals_1.it)('should return Bürokratt network languages', () => {
            const languages = bridge.getBurokrattLanguages();
            (0, globals_1.expect)(languages).toContain('et');
            (0, globals_1.expect)(languages).toContain('fi');
            (0, globals_1.expect)(languages).toContain('lv');
            (0, globals_1.expect)(languages).toContain('lt');
            (0, globals_1.expect)(languages).toContain('en');
            (0, globals_1.expect)(languages).toContain('ru');
        });
    });
    (0, globals_1.describe)('translation support check', () => {
        (0, globals_1.it)('should support direct translation pairs', () => {
            (0, globals_1.expect)(bridge.isTranslationSupported('et', 'en')).toBe(true);
            (0, globals_1.expect)(bridge.isTranslationSupported('en', 'et')).toBe(true);
            (0, globals_1.expect)(bridge.isTranslationSupported('fi', 'en')).toBe(true);
            (0, globals_1.expect)(bridge.isTranslationSupported('de', 'en')).toBe(true);
        });
        (0, globals_1.it)('should support pivot translations via English', () => {
            (0, globals_1.expect)(bridge.isTranslationSupported('et', 'fi')).toBe(true);
            (0, globals_1.expect)(bridge.isTranslationSupported('de', 'fr')).toBe(true);
        });
        (0, globals_1.it)('should return true for same language', () => {
            (0, globals_1.expect)(bridge.isTranslationSupported('en', 'en')).toBe(true);
            (0, globals_1.expect)(bridge.isTranslationSupported('et', 'et')).toBe(true);
        });
    });
    (0, globals_1.describe)('translation', () => {
        (0, globals_1.it)('should translate text with auto-detection', async () => {
            const result = await bridge.translate({
                text: 'Hello world',
                targetLanguage: 'et',
            });
            (0, globals_1.expect)(result.originalText).toBe('Hello world');
            (0, globals_1.expect)(result.sourceLanguage).toBe('en');
            (0, globals_1.expect)(result.targetLanguage).toBe('et');
            (0, globals_1.expect)(result.translatedText).toBeDefined();
            (0, globals_1.expect)(result.confidence).toBeGreaterThan(0);
            (0, globals_1.expect)(result.processingTimeMs).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.it)('should translate text with specified source language', async () => {
            const result = await bridge.translate({
                text: 'Tere maailm',
                sourceLanguage: 'et',
                targetLanguage: 'en',
            });
            (0, globals_1.expect)(result.sourceLanguage).toBe('et');
            (0, globals_1.expect)(result.targetLanguage).toBe('en');
            (0, globals_1.expect)(result.translatedText).toBeDefined();
        });
        (0, globals_1.it)('should return same text for same language', async () => {
            const result = await bridge.translate({
                text: 'Hello world',
                sourceLanguage: 'en',
                targetLanguage: 'en',
            });
            (0, globals_1.expect)(result.translatedText).toBe('Hello world');
        });
        (0, globals_1.it)('should use cache for repeated translations', async () => {
            const text = 'Cached translation test';
            const result1 = await bridge.translate({
                text,
                sourceLanguage: 'en',
                targetLanguage: 'et',
            });
            const result2 = await bridge.translate({
                text,
                sourceLanguage: 'en',
                targetLanguage: 'et',
            });
            // Second call should be faster (cached)
            (0, globals_1.expect)(result2.processingTimeMs).toBeLessThanOrEqual(result1.processingTimeMs);
        });
        (0, globals_1.it)('should throw for unsupported language pair', async () => {
            await (0, globals_1.expect)(bridge.translate({
                text: 'Test',
                sourceLanguage: 'xx',
                targetLanguage: 'yy',
            })).rejects.toThrow('No translation path');
        });
    });
    (0, globals_1.describe)('message translation', () => {
        (0, globals_1.it)('should translate cross-border message', async () => {
            const message = {
                id: 'msg-001',
                sessionId: 'session-001',
                type: 'user',
                content: 'Hello, I need help with my application',
                language: 'en',
                timestamp: new Date(),
                metadata: {
                    sourceNation: 'US',
                    encrypted: false,
                },
            };
            const translated = await bridge.translateMessage(message, 'et');
            (0, globals_1.expect)(translated.id).toBe(message.id);
            (0, globals_1.expect)(translated.language).toBe('en'); // Original language preserved
            (0, globals_1.expect)(translated.translations).toBeDefined();
            (0, globals_1.expect)(translated.translations?.et).toBeDefined();
        });
        (0, globals_1.it)('should skip translation for same language', async () => {
            const message = {
                id: 'msg-002',
                sessionId: 'session-001',
                type: 'assistant',
                content: 'Here is your response',
                language: 'en',
                timestamp: new Date(),
                metadata: {
                    sourceNation: 'US',
                    encrypted: false,
                },
            };
            const result = await bridge.translateMessage(message, 'en');
            (0, globals_1.expect)(result).toEqual(message);
        });
    });
    (0, globals_1.describe)('entity translation', () => {
        (0, globals_1.it)('should translate translatable entity types', async () => {
            const entities = [
                { type: 'description', value: 'Tax filing deadline', confidence: 0.9, redacted: false },
                { type: 'id', value: '12345', confidence: 1.0, redacted: false },
                { type: 'summary', value: 'Request for extension', confidence: 0.85, redacted: false },
            ];
            const translated = await bridge.translateEntities(entities, 'et', 'en');
            // description and summary should be translated
            (0, globals_1.expect)(translated[0].value).not.toBe('Tax filing deadline');
            (0, globals_1.expect)(translated[2].value).not.toBe('Request for extension');
            // id should not be translated
            (0, globals_1.expect)(translated[1].value).toBe('12345');
        });
        (0, globals_1.it)('should preserve redacted entities', async () => {
            const entities = [
                { type: 'description', value: '[REDACTED]', confidence: 0.9, redacted: true },
            ];
            const translated = await bridge.translateEntities(entities, 'et', 'en');
            (0, globals_1.expect)(translated[0].value).toBe('[REDACTED]');
            (0, globals_1.expect)(translated[0].redacted).toBe(true);
        });
    });
    (0, globals_1.describe)('cache management', () => {
        (0, globals_1.it)('should clear cache', async () => {
            // Add something to cache
            await bridge.translate({
                text: 'Cache test',
                targetLanguage: 'et',
            });
            bridge.clearCache();
            // After clearing, translation should work but won't be cached
            const result = await bridge.translate({
                text: 'Cache test',
                targetLanguage: 'et',
            });
            (0, globals_1.expect)(result.translatedText).toBeDefined();
        });
    });
});
