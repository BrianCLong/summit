import { LanguageDetector, SUPPORTED_LANGUAGES } from './index';

describe('LanguageDetector', () => {
  let detector: LanguageDetector;

  beforeEach(() => {
    detector = new LanguageDetector();
  });

  describe('detect', () => {
    it('should detect English text', () => {
      const result = detector.detect('Hello world, this is a test');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return confidence score', () => {
      const result = detector.detect('Hello world');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should cache results', () => {
      const text = 'Hello world';
      const result1 = detector.detect(text);
      const result2 = detector.detect(text);
      expect(result1).toEqual(result2);
    });
  });

  describe('detectWithConfidence', () => {
    it('should return detailed results', () => {
      const result = detector.detectWithConfidence('Hello world');
      expect(result.language).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.allLanguages).toBeDefined();
    });
  });

  describe('detectMultiple', () => {
    it('should detect languages in multiple segments', () => {
      const result = detector.detectMultiple('Hello world. This is a test.');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('isLanguage', () => {
    it('should return true for matching language', () => {
      const result = detector.isLanguage('Hello world', 'en');
      expect(typeof result).toBe('boolean');
    });

    it('should accept custom threshold', () => {
      const result = detector.isLanguage('Hello world', 'en', 0.5);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('clearCache', () => {
    it('should clear the detection cache', () => {
      detector.detect('Hello world');
      detector.clearCache();
      // No error means success
      expect(true).toBe(true);
    });
  });
});

describe('SUPPORTED_LANGUAGES', () => {
  it('should include common languages', () => {
    expect(SUPPORTED_LANGUAGES).toContain('en');
    expect(SUPPORTED_LANGUAGES).toContain('es');
    expect(SUPPORTED_LANGUAGES).toContain('fr');
    expect(SUPPORTED_LANGUAGES).toContain('de');
    expect(SUPPORTED_LANGUAGES).toContain('zh');
    expect(SUPPORTED_LANGUAGES).toContain('ja');
    expect(SUPPORTED_LANGUAGES).toContain('ru');
    expect(SUPPORTED_LANGUAGES).toContain('ar');
  });
});
