import { TextPreprocessor, preprocessing } from './index';

describe('TextPreprocessor', () => {
  let preprocessor: TextPreprocessor;

  beforeEach(() => {
    preprocessor = new TextPreprocessor();
  });

  describe('preprocess', () => {
    it('should lowercase text by default', () => {
      const result = preprocessor.preprocess('Hello WORLD');
      expect(result).toBe('hello world');
    });

    it('should remove URLs', () => {
      const result = preprocessor.preprocess('Visit https://example.com for more info');
      expect(result).not.toContain('https://example.com');
    });

    it('should remove email addresses', () => {
      const result = preprocessor.preprocess('Contact test@example.com');
      expect(result).not.toContain('test@example.com');
    });

    it('should remove HTML tags', () => {
      const result = preprocessor.preprocess('<p>Hello <b>World</b></p>');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<b>');
      expect(result).toContain('hello');
      expect(result).toContain('world');
    });

    it('should normalize whitespace', () => {
      const result = preprocessor.preprocess('Hello   world   test');
      expect(result).toBe('hello world test');
    });

    it('should handle empty string', () => {
      const result = preprocessor.preprocess('');
      expect(result).toBe('');
    });
  });

  describe('clean', () => {
    it('should remove control characters', () => {
      const result = preprocessor.clean('Hello\x00World');
      expect(result).toBe('Hello World');
    });

    it('should trim whitespace', () => {
      const result = preprocessor.clean('  Hello World  ');
      expect(result).toBe('Hello World');
    });
  });

  describe('pipeline', () => {
    it('should return a preprocessing function', () => {
      const pipeline = preprocessor.pipeline();
      expect(typeof pipeline).toBe('function');
      const result = pipeline('Hello WORLD');
      expect(result).toBe('hello world');
    });
  });
});

describe('preprocessing utilities', () => {
  describe('removeStopwords', () => {
    it('should remove common English stopwords', () => {
      const result = preprocessing.removeStopwords('the quick brown fox jumps over the lazy dog');
      expect(result).not.toContain('the');
      expect(result).toContain('quick');
      expect(result).toContain('brown');
      expect(result).toContain('fox');
    });
  });

  describe('removePunctuation', () => {
    it('should remove punctuation', () => {
      const result = preprocessing.removePunctuation('Hello, world! How are you?');
      expect(result).not.toContain(',');
      expect(result).not.toContain('!');
      expect(result).not.toContain('?');
    });
  });

  describe('normalizeWhitespace', () => {
    it('should normalize whitespace', () => {
      const result = preprocessing.normalizeWhitespace('Hello   world   test');
      expect(result).toBe('Hello world test');
    });

    it('should trim leading and trailing whitespace', () => {
      const result = preprocessing.normalizeWhitespace('  Hello world  ');
      expect(result).toBe('Hello world');
    });
  });
});
