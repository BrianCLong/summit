/**
 * Unit tests for Multilingual Bridge
 */

import { MultilingualBridge } from '../multilingual-bridge.js';

describe('MultilingualBridge', () => {
  let bridge: MultilingualBridge;

  beforeEach(() => {
    bridge = new MultilingualBridge();
  });

  describe('language detection', () => {
    it('should detect Estonian text', async () => {
      const result = await bridge.detectLanguage('Tere, kuidas läheb? Õnnitleme teid!');
      expect(result.language).toBe('et');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect English text', async () => {
      const result = await bridge.detectLanguage('Hello, how are you? The weather is nice today.');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Russian text', async () => {
      const result = await bridge.detectLanguage('Привет, как дела? Сегодня хорошая погода.');
      expect(result.language).toBe('ru');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Finnish text', async () => {
      const result = await bridge.detectLanguage('Hyvää päivää! Miten menee?');
      expect(result.language).toBe('fi');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect German text', async () => {
      const result = await bridge.detectLanguage('Guten Tag! Wie geht es Ihnen? Die Straße ist schön.');
      expect(result.language).toBe('de');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should provide alternatives', async () => {
      const result = await bridge.detectLanguage('Hello world');
      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });

    it('should default to English for ambiguous text', async () => {
      const result = await bridge.detectLanguage('OK');
      expect(result.language).toBe('en');
    });
  });

  describe('supported languages', () => {
    it('should return list of supported languages', () => {
      const languages = bridge.getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('et');
      expect(languages).toContain('fi');
      expect(languages).toContain('de');
      expect(languages.length).toBeGreaterThan(10);
    });

    it('should return Bürokratt network languages', () => {
      const languages = bridge.getBurokrattLanguages();
      expect(languages).toContain('et');
      expect(languages).toContain('fi');
      expect(languages).toContain('lv');
      expect(languages).toContain('lt');
      expect(languages).toContain('en');
      expect(languages).toContain('ru');
    });
  });

  describe('translation support check', () => {
    it('should support direct translation pairs', () => {
      expect(bridge.isTranslationSupported('et', 'en')).toBe(true);
      expect(bridge.isTranslationSupported('en', 'et')).toBe(true);
      expect(bridge.isTranslationSupported('fi', 'en')).toBe(true);
      expect(bridge.isTranslationSupported('de', 'en')).toBe(true);
    });

    it('should support pivot translations via English', () => {
      expect(bridge.isTranslationSupported('et', 'fi')).toBe(true);
      expect(bridge.isTranslationSupported('de', 'fr')).toBe(true);
    });

    it('should return true for same language', () => {
      expect(bridge.isTranslationSupported('en', 'en')).toBe(true);
      expect(bridge.isTranslationSupported('et', 'et')).toBe(true);
    });
  });

  describe('translation', () => {
    it('should translate text with auto-detection', async () => {
      const result = await bridge.translate({
        text: 'Hello world',
        targetLanguage: 'et',
      });

      expect(result.originalText).toBe('Hello world');
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('et');
      expect(result.translatedText).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should translate text with specified source language', async () => {
      const result = await bridge.translate({
        text: 'Tere maailm',
        sourceLanguage: 'et',
        targetLanguage: 'en',
      });

      expect(result.sourceLanguage).toBe('et');
      expect(result.targetLanguage).toBe('en');
      expect(result.translatedText).toBeDefined();
    });

    it('should return same text for same language', async () => {
      const result = await bridge.translate({
        text: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'en',
      });

      expect(result.translatedText).toBe('Hello world');
    });

    it('should use cache for repeated translations', async () => {
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
      expect(result2.processingTimeMs).toBeLessThanOrEqual(result1.processingTimeMs);
    });

    it('should throw for unsupported language pair', async () => {
      await expect(
        bridge.translate({
          text: 'Test',
          sourceLanguage: 'xx',
          targetLanguage: 'yy',
        })
      ).rejects.toThrow('No translation path');
    });
  });

  describe('message translation', () => {
    it('should translate cross-border message', async () => {
      const message = {
        id: 'msg-001',
        sessionId: 'session-001',
        type: 'user' as const,
        content: 'Hello, I need help with my application',
        language: 'en',
        timestamp: new Date(),
        metadata: {
          sourceNation: 'US',
          encrypted: false,
        },
      };

      const translated = await bridge.translateMessage(message, 'et');

      expect(translated.id).toBe(message.id);
      expect(translated.language).toBe('en'); // Original language preserved
      expect(translated.translations).toBeDefined();
      expect(translated.translations?.et).toBeDefined();
    });

    it('should skip translation for same language', async () => {
      const message = {
        id: 'msg-002',
        sessionId: 'session-001',
        type: 'assistant' as const,
        content: 'Here is your response',
        language: 'en',
        timestamp: new Date(),
        metadata: {
          sourceNation: 'US',
          encrypted: false,
        },
      };

      const result = await bridge.translateMessage(message, 'en');
      expect(result).toEqual(message);
    });
  });

  describe('entity translation', () => {
    it('should translate translatable entity types', async () => {
      const entities = [
        { type: 'description', value: 'Tax filing deadline', confidence: 0.9, redacted: false },
        { type: 'id', value: '12345', confidence: 1.0, redacted: false },
        { type: 'summary', value: 'Request for extension', confidence: 0.85, redacted: false },
      ];

      const translated = await bridge.translateEntities(entities, 'et', 'en');

      // description and summary should be translated
      expect(translated[0].value).not.toBe('Tax filing deadline');
      expect(translated[2].value).not.toBe('Request for extension');

      // id should not be translated
      expect(translated[1].value).toBe('12345');
    });

    it('should preserve redacted entities', async () => {
      const entities = [
        { type: 'description', value: '[REDACTED]', confidence: 0.9, redacted: true },
      ];

      const translated = await bridge.translateEntities(entities, 'et', 'en');
      expect(translated[0].value).toBe('[REDACTED]');
      expect(translated[0].redacted).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
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

      expect(result.translatedText).toBeDefined();
    });
  });
});
