import { Tokenizer, tokenization } from './index';

describe('Tokenizer', () => {
  let tokenizer: Tokenizer;

  beforeEach(() => {
    tokenizer = new Tokenizer();
  });

  describe('tokenize', () => {
    it('should tokenize text into words', () => {
      const tokens = tokenizer.tokenize('Hello world test');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].text).toBe('Hello');
      expect(tokens[1].text).toBe('world');
      expect(tokens[2].text).toBe('test');
    });

    it('should track token positions', () => {
      const tokens = tokenizer.tokenize('Hello world');
      expect(tokens[0].start).toBe(0);
      expect(tokens[0].end).toBe(5);
      expect(tokens[1].start).toBe(6);
      expect(tokens[1].end).toBe(11);
    });

    it('should handle empty string', () => {
      const tokens = tokenizer.tokenize('');
      expect(tokens).toHaveLength(0);
    });

    it('should handle punctuation-only text', () => {
      const tokens = tokenizer.tokenize('!@#$%');
      expect(tokens).toHaveLength(0);
    });
  });

  describe('sentenceTokenize', () => {
    it('should tokenize text into sentences', () => {
      const sentences = tokenizer.sentenceTokenize('Hello world. How are you? I am fine!');
      expect(sentences).toHaveLength(3);
      expect(sentences[0].text).toContain('Hello world');
      expect(sentences[1].text).toContain('How are you');
      expect(sentences[2].text).toContain('I am fine');
    });

    it('should handle single sentence without terminator', () => {
      const sentences = tokenizer.sentenceTokenize('Hello world');
      expect(sentences).toHaveLength(1);
      expect(sentences[0].text).toBe('Hello world');
    });

    it('should include tokens in sentences', () => {
      const sentences = tokenizer.sentenceTokenize('Hello world.');
      expect(sentences[0].tokens.length).toBeGreaterThan(0);
    });
  });

  describe('tokenizeWithPositions', () => {
    it('should return tokens with positions', () => {
      const result = tokenizer.tokenizeWithPositions('Hello world');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ token: 'Hello', start: 0, end: 5 });
      expect(result[1]).toEqual({ token: 'world', start: 6, end: 11 });
    });
  });
});

describe('tokenization utilities', () => {
  describe('words', () => {
    it('should tokenize into words', () => {
      const words = tokenization.words('Hello world test');
      expect(words).toEqual(['Hello', 'world', 'test']);
    });

    it('should return empty array for empty string', () => {
      const words = tokenization.words('');
      expect(words).toEqual([]);
    });
  });

  describe('sentences', () => {
    it('should tokenize into sentences', () => {
      const sentences = tokenization.sentences('Hello. World.');
      expect(sentences).toHaveLength(2);
    });

    it('should handle text without sentence terminators', () => {
      const sentences = tokenization.sentences('Hello world');
      expect(sentences).toEqual(['Hello world']);
    });
  });

  describe('ngrams', () => {
    it('should generate bigrams', () => {
      const tokens = ['a', 'b', 'c', 'd'];
      const bigrams = tokenization.ngrams(tokens, 2);
      expect(bigrams).toEqual([
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'd'],
      ]);
    });

    it('should generate trigrams', () => {
      const tokens = ['a', 'b', 'c', 'd'];
      const trigrams = tokenization.ngrams(tokens, 3);
      expect(trigrams).toEqual([
        ['a', 'b', 'c'],
        ['b', 'c', 'd'],
      ]);
    });

    it('should return empty array if n > tokens length', () => {
      const tokens = ['a', 'b'];
      const ngrams = tokenization.ngrams(tokens, 5);
      expect(ngrams).toEqual([]);
    });
  });

  describe('charNgrams', () => {
    it('should generate character n-grams', () => {
      const ngrams = tokenization.charNgrams('hello', 2);
      expect(ngrams).toEqual(['he', 'el', 'll', 'lo']);
    });
  });
});
