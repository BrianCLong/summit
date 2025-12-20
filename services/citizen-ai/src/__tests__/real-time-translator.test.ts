import {
  RealTimeTranslator,
  realTimeTranslator,
} from '@intelgraph/language-models/translation';

describe('RealTimeTranslator', () => {
  let translator: RealTimeTranslator;

  beforeEach(() => {
    translator = new RealTimeTranslator();
  });

  describe('translate', () => {
    it('should return empty string for empty input', async () => {
      const result = await translator.translate('', 'de');
      expect(result.translatedText).toBe('');
      expect(result.confidence).toBe(1.0);
    });

    it('should return same text when source equals target', async () => {
      const result = await translator.translate('Hello world', 'en', 'en');
      expect(result.translatedText).toBe('Hello world');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect language automatically', async () => {
      const result = await translator.translate('Tere päevast', 'en');
      expect(result.sourceLanguage).toBe('et');
    });
  });

  describe('detectLanguage', () => {
    it('should detect Estonian characters', async () => {
      const lang = await translator.detectLanguage('Tere, kuidas läheb?');
      expect(lang).toBe('et');
    });

    it('should detect Russian characters', async () => {
      const lang = await translator.detectLanguage('Привет мир');
      expect(lang).toBe('ru');
    });

    it('should detect Chinese characters', async () => {
      const lang = await translator.detectLanguage('你好世界');
      expect(lang).toBe('zh');
    });

    it('should detect Arabic characters', async () => {
      const lang = await translator.detectLanguage('مرحبا بالعالم');
      expect(lang).toBe('ar');
    });

    it('should default to English', async () => {
      const lang = await translator.detectLanguage('Hello world');
      expect(lang).toBe('en');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = translator.getSupportedLanguages();
      expect(languages.length).toBeGreaterThan(30);
      expect(languages.some((l) => l.code === 'en')).toBe(true);
      expect(languages.some((l) => l.code === 'et')).toBe(true);
      expect(languages.some((l) => l.code === 'ru')).toBe(true);
    });
  });

  describe('isLanguagePairSupported', () => {
    it('should return true for supported pairs', () => {
      expect(translator.isLanguagePairSupported('en', 'et')).toBe(true);
      expect(translator.isLanguagePairSupported('ru', 'de')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(translator.isLanguagePairSupported('xyz', 'en')).toBe(false);
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts', async () => {
      const texts = ['Hello', 'World', 'Test'];
      const results = await translator.translateBatch(texts, 'de');
      expect(results.length).toBe(3);
    });
  });

  describe('translateOfficial', () => {
    it('should include official disclaimer', async () => {
      const result = await translator.translateOfficial('Official document text', 'de');
      expect(result.officialDisclaimer).toBeDefined();
      expect(result.officialDisclaimer).toContain('informational purposes');
    });
  });

  describe('translateStream', () => {
    it('should stream translation with callbacks', async () => {
      const chunks: string[] = [];
      const result = await translator.translateStream(
        'This is a long text that should be chunked. It has multiple sentences.',
        'de',
        {
          chunkSize: 30,
          onChunk: (chunk) => chunks.push(chunk.translatedText),
        }
      );
      expect(result.translatedText).toBeDefined();
    });
  });
});

describe('realTimeTranslator singleton', () => {
  it('should be defined', () => {
    expect(realTimeTranslator).toBeDefined();
  });
});
