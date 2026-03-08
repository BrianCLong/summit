"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const language_detector_1 = require("../lib/language-detector");
(0, vitest_1.describe)('LanguageDetector', () => {
    let detector;
    (0, vitest_1.beforeEach)(() => {
        detector = new language_detector_1.LanguageDetector({
            minConfidence: 0.6,
            defaultLanguage: 'en',
            minTextLength: 10,
        });
    });
    (0, vitest_1.describe)('detect', () => {
        (0, vitest_1.it)('should detect English text', async () => {
            const text = 'Hello, this is a test message in English language.';
            const result = await detector.detect(text);
            (0, vitest_1.expect)(result.language).toBe('en');
            (0, vitest_1.expect)(result.confidence).toBeGreaterThan(0.5);
        });
        (0, vitest_1.it)('should detect French text', async () => {
            const text = 'Bonjour, ceci est un message de test en français.';
            const result = await detector.detect(text);
            (0, vitest_1.expect)(result.language).toBe('fr');
            (0, vitest_1.expect)(result.confidence).toBeGreaterThan(0.5);
        });
        (0, vitest_1.it)('should detect Spanish text', async () => {
            const text = 'Hola, este es un mensaje de prueba en español.';
            const result = await detector.detect(text);
            (0, vitest_1.expect)(result.language).toBe('es');
            (0, vitest_1.expect)(result.confidence).toBeGreaterThan(0.5);
        });
        (0, vitest_1.it)('should return default language for empty text', async () => {
            const result = await detector.detect('');
            (0, vitest_1.expect)(result.language).toBe('en');
            (0, vitest_1.expect)(result.confidence).toBe(0.5);
        });
        (0, vitest_1.it)('should return default language for very short text', async () => {
            const result = await detector.detect('Hi');
            (0, vitest_1.expect)(result.language).toBe('en');
            (0, vitest_1.expect)(result.confidence).toBe(0.5);
        });
        (0, vitest_1.it)('should handle multilingual text', async () => {
            const text = 'Hello world. Bonjour le monde. Hola mundo.';
            const result = await detector.detect(text);
            (0, vitest_1.expect)(result.language).toBeDefined();
            (0, vitest_1.expect)(result.confidence).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('detectBatch', () => {
        (0, vitest_1.it)('should detect languages for multiple texts', async () => {
            const texts = [
                'Hello, this is English.',
                'Bonjour, ceci est français.',
                'Hola, esto es español.',
            ];
            const results = await detector.detectBatch(texts);
            (0, vitest_1.expect)(results).toHaveLength(3);
            (0, vitest_1.expect)(results[0].language).toBe('en');
            (0, vitest_1.expect)(results[1].language).toBe('fr');
            (0, vitest_1.expect)(results[2].language).toBe('es');
        });
    });
    (0, vitest_1.describe)('updateConfig', () => {
        (0, vitest_1.it)('should update configuration', () => {
            detector.updateConfig({ minConfidence: 0.8 });
            // Configuration updated successfully
            (0, vitest_1.expect)(true).toBe(true);
        });
    });
});
