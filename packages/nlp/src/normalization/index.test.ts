import { TextNormalizer, caseFolding, unicode } from './index';

describe('TextNormalizer', () => {
  let normalizer: TextNormalizer;

  beforeEach(() => {
    normalizer = new TextNormalizer();
  });

  describe('normalize', () => {
    it('should lowercase text by default', () => {
      const result = normalizer.normalize('Hello WORLD');
      expect(result).toBe('hello world');
    });

    it('should normalize whitespace', () => {
      const result = normalizer.normalize('Hello   world');
      expect(result).toBe('hello world');
    });

    it('should handle empty string', () => {
      const result = normalizer.normalize('');
      expect(result).toBe('');
    });
  });
});

describe('caseFolding', () => {
  describe('toLowerCase', () => {
    it('should convert to lowercase', () => {
      expect(caseFolding.toLowerCase('HELLO')).toBe('hello');
    });
  });

  describe('toUpperCase', () => {
    it('should convert to uppercase', () => {
      expect(caseFolding.toUpperCase('hello')).toBe('HELLO');
    });
  });

  describe('toTitleCase', () => {
    it('should convert to title case', () => {
      expect(caseFolding.toTitleCase('hello world')).toBe('Hello World');
    });
  });

  describe('toSentenceCase', () => {
    it('should convert to sentence case', () => {
      expect(caseFolding.toSentenceCase('HELLO WORLD')).toBe('Hello world');
    });
  });
});

describe('unicode', () => {
  describe('NFC', () => {
    it('should normalize to NFC', () => {
      const result = unicode.NFC('café');
      expect(typeof result).toBe('string');
    });
  });

  describe('NFD', () => {
    it('should normalize to NFD', () => {
      const result = unicode.NFD('café');
      expect(typeof result).toBe('string');
    });
  });

  describe('NFKC', () => {
    it('should normalize to NFKC', () => {
      const result = unicode.NFKC('ﬁ');
      expect(result).toBe('fi');
    });
  });

  describe('NFKD', () => {
    it('should normalize to NFKD', () => {
      const result = unicode.NFKD('ﬁ');
      expect(result).toBe('fi');
    });
  });
});
