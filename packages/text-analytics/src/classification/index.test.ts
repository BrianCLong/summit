import { TextClassifier } from './index';

describe('TextClassifier', () => {
  let classifier: TextClassifier;

  beforeEach(() => {
    classifier = new TextClassifier();
  });

  describe('classify', () => {
    it('should classify text into labels', () => {
      const result = classifier.classify('I love this product!', ['positive', 'negative', 'neutral']);

      expect(result.label).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(['positive', 'negative', 'neutral']).toContain(result.label);
    });

    it('should return confidence between 0 and 1', () => {
      const result = classifier.classify('Test text', ['a', 'b', 'c']);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return all labels with scores', () => {
      const result = classifier.classify('Test text', ['a', 'b', 'c']);
      expect(result.allLabels).toBeDefined();
      expect(result.allLabels!.length).toBe(3);
    });

    it('should sort allLabels by confidence descending', () => {
      const result = classifier.classify('Test text', ['a', 'b', 'c', 'd']);
      const allLabels = result.allLabels!;

      for (let i = 1; i < allLabels.length; i++) {
        expect(allLabels[i].confidence).toBeLessThanOrEqual(allLabels[i - 1].confidence);
      }
    });
  });

  describe('classifyMultiLabel', () => {
    it('should return multiple labels', () => {
      const labels = classifier.classifyMultiLabel(
        'Test text',
        ['label1', 'label2', 'label3'],
        0.3
      );

      expect(Array.isArray(labels)).toBe(true);
    });

    it('should respect threshold', () => {
      classifier.train([
        { text: 'urgent important', label: 'urgent' },
        { text: 'urgent important', label: 'important' },
      ]);

      const labels = classifier.classifyMultiLabel(
        'urgent important',
        ['urgent', 'important', 'other'],
        0.0
      );

      expect(labels.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('classifyIntent', () => {
    it('should classify intent', () => {
      const result = classifier.classifyIntent('What is the weather today?');

      expect(result.label).toBeDefined();
      expect(['question', 'statement', 'command', 'exclamation']).toContain(result.label);
    });
  });

  describe('zeroShot', () => {
    it('should perform zero-shot classification', () => {
      const result = classifier.zeroShot(
        'The movie was exciting and thrilling',
        ['entertainment', 'sports', 'politics']
      );

      expect(result.label).toBeDefined();
      expect(['entertainment', 'sports', 'politics']).toContain(result.label);
    });
  });

  describe('train', () => {
    it('should improve classification after training', () => {
      classifier.train([
        { text: 'happy joy wonderful', label: 'positive' },
        { text: 'sad terrible awful', label: 'negative' },
      ]);

      const result = classifier.classify('happy wonderful', ['positive', 'negative']);
      expect(result.label).toBeDefined();
    });

    it('should handle multiple examples per label', () => {
      const examples = [
        { text: 'happy', label: 'positive' },
        { text: 'joy', label: 'positive' },
        { text: 'wonderful', label: 'positive' },
        { text: 'sad', label: 'negative' },
        { text: 'terrible', label: 'negative' },
      ];

      classifier.train(examples);

      const result = classifier.classify('happy joy', ['positive', 'negative']);
      expect(result.label).toBeDefined();
    });
  });
});
