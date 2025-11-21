import { Summarizer } from './index';

describe('Summarizer', () => {
  let summarizer: Summarizer;

  const longText = `
    Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.
    It focuses on developing computer programs that can access data and use it to learn for themselves.
    The process begins with observations or data, such as examples, direct experience, or instruction.
    It then looks for patterns in data and makes better decisions in the future based on the examples provided.
    The primary aim is to allow computers to learn automatically without human intervention.
  `;

  beforeEach(() => {
    summarizer = new Summarizer();
  });

  describe('extractive', () => {
    it('should generate extractive summary', async () => {
      const result = await summarizer.extractive(longText, 2);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.type).toBe('extractive');
    });

    it('should respect maxSentences parameter', async () => {
      const result = await summarizer.extractive(longText, 2);
      const sentences = result.summary.match(/[^.!?]+[.!?]+/g) || [];
      expect(sentences.length).toBeLessThanOrEqual(2);
    });

    it('should include compression ratio', async () => {
      const result = await summarizer.extractive(longText, 2);

      expect(typeof result.compressionRatio).toBe('number');
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('abstractive', () => {
    it('should generate abstractive summary', async () => {
      const result = await summarizer.abstractive(longText, 100);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.type).toBe('abstractive');
    });

    it('should include compression ratio', async () => {
      const result = await summarizer.abstractive(longText, 100);
      expect(typeof result.compressionRatio).toBe('number');
    });
  });

  describe('bulletPoints', () => {
    it('should generate bullet points', async () => {
      const points = await summarizer.bulletPoints(longText, 3);

      expect(Array.isArray(points)).toBe(true);
      expect(points.length).toBeLessThanOrEqual(3);
    });

    it('should return strings', async () => {
      const points = await summarizer.bulletPoints(longText, 3);

      points.forEach(point => {
        expect(typeof point).toBe('string');
        expect(point.length).toBeGreaterThan(0);
      });
    });
  });

  describe('multiDocument', () => {
    it('should summarize multiple documents', async () => {
      const documents = [
        'Machine learning is a subset of AI.',
        'Deep learning uses neural networks.',
        'Natural language processing handles text.',
      ];

      const result = await summarizer.multiDocument(documents, 100);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });
});
