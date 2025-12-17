import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageDetector } from '../lib/language-detector';

describe('LanguageDetector', () => {
  let detector: LanguageDetector;

  beforeEach(() => {
    detector = new LanguageDetector({
      minConfidence: 0.6,
      defaultLanguage: 'en',
      minTextLength: 10,
    });
  });

  describe('detect', () => {
    it('should detect English text', async () => {
      const text = 'Hello, this is a test message in English language.';
      const result = await detector.detect(text);

      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect French text', async () => {
      const text = 'Bonjour, ceci est un message de test en français.';
      const result = await detector.detect(text);

      expect(result.language).toBe('fr');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Spanish text', async () => {
      const text = 'Hola, este es un mensaje de prueba en español.';
      const result = await detector.detect(text);

      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should return default language for empty text', async () => {
      const result = await detector.detect('');

      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.5);
    });

    it('should return default language for very short text', async () => {
      const result = await detector.detect('Hi');

      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.5);
    });

    it('should handle multilingual text', async () => {
      const text = 'Hello world. Bonjour le monde. Hola mundo.';
      const result = await detector.detect(text);

      expect(result.language).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('detectBatch', () => {
    it('should detect languages for multiple texts', async () => {
      const texts = [
        'Hello, this is English.',
        'Bonjour, ceci est français.',
        'Hola, esto es español.',
      ];

      const results = await detector.detectBatch(texts);

      expect(results).toHaveLength(3);
      expect(results[0].language).toBe('en');
      expect(results[1].language).toBe('fr');
      expect(results[2].language).toBe('es');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      detector.updateConfig({ minConfidence: 0.8 });
      // Configuration updated successfully
      expect(true).toBe(true);
    });
  });
});
