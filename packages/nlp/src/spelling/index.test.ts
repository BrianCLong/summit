import { SpellChecker, spelling } from './index';

describe('SpellChecker', () => {
  let checker: SpellChecker;

  beforeEach(() => {
    checker = new SpellChecker();
  });

  describe('check', () => {
    it('should return true for correctly spelled words', () => {
      expect(checker.check('the')).toBe(true);
      expect(checker.check('and')).toBe(true);
    });

    it('should ignore numbers when configured', () => {
      expect(checker.check('123')).toBe(true);
    });

    it('should be case-insensitive by default', () => {
      expect(checker.check('The')).toBe(true);
      expect(checker.check('THE')).toBe(true);
    });
  });

  describe('suggest', () => {
    it('should return suggestions for misspelled words', () => {
      const suggestions = checker.suggest('teh');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should return the word itself if correctly spelled', () => {
      const suggestions = checker.suggest('the');
      expect(suggestions).toContain('the');
    });

    it('should respect suggestions limit', () => {
      const checker = new SpellChecker({ suggestionsLimit: 3 });
      const suggestions = checker.suggest('teh');
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('correct', () => {
    it('should return original word if auto-correct is disabled', () => {
      const result = checker.correct('teh');
      expect(result).toBe('teh');
    });

    it('should auto-correct when enabled', () => {
      const autoChecker = new SpellChecker({ autoCorrect: true });
      const result = autoChecker.correct('teh');
      expect(typeof result).toBe('string');
    });
  });

  describe('addWords', () => {
    it('should add words to dictionary', () => {
      checker.addWords(['customword']);
      expect(checker.check('customword')).toBe(true);
    });
  });

  describe('removeWords', () => {
    it('should remove words from dictionary', () => {
      checker.addWords(['testword']);
      checker.removeWords(['testword']);
      expect(checker.check('testword')).toBe(false);
    });
  });

  describe('clearDictionary', () => {
    it('should reset dictionary to default', () => {
      checker.addWords(['customword']);
      checker.clearDictionary();
      expect(checker.check('customword')).toBe(false);
      expect(checker.check('the')).toBe(true);
    });
  });
});

describe('spelling utilities', () => {
  describe('isLikelyMisspelled', () => {
    it('should detect repeated characters', () => {
      expect(spelling.isLikelyMisspelled('hellllo')).toBe(true);
    });

    it('should detect unusual character sequences', () => {
      expect(spelling.isLikelyMisspelled('qwrtp')).toBe(true);
    });

    it('should return false for normal words', () => {
      expect(spelling.isLikelyMisspelled('hello')).toBe(false);
    });
  });

  describe('editDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(spelling.editDistance('hello', 'hello')).toBe(0);
    });

    it('should calculate correct distance', () => {
      expect(spelling.editDistance('hello', 'helo')).toBe(1);
      expect(spelling.editDistance('hello', 'world')).toBe(4);
    });

    it('should handle empty strings', () => {
      expect(spelling.editDistance('', 'hello')).toBe(5);
      expect(spelling.editDistance('hello', '')).toBe(5);
      expect(spelling.editDistance('', '')).toBe(0);
    });
  });
});
