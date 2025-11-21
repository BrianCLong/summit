import { EmbeddingGenerator } from './index';

describe('EmbeddingGenerator', () => {
  let generator: EmbeddingGenerator;

  beforeEach(() => {
    generator = new EmbeddingGenerator();
  });

  describe('encode', () => {
    it('should generate embeddings for text', async () => {
      const embedding = await generator.encode('Hello world');

      expect(embedding).toBeDefined();
      expect(embedding.vector).toBeDefined();
      expect(Array.isArray(embedding.vector)).toBe(true);
    });

    it('should return correct dimension', async () => {
      const embedding = await generator.encode('Hello world');
      expect(embedding.dimension).toBe(768);
      expect(embedding.vector.length).toBe(768);
    });

    it('should include model name', async () => {
      const embedding = await generator.encode('Hello world');
      expect(embedding.model).toBeDefined();
      expect(typeof embedding.model).toBe('string');
    });

    it('should generate numeric vectors', async () => {
      const embedding = await generator.encode('Hello world');
      embedding.vector.forEach(value => {
        expect(typeof value).toBe('number');
        expect(!isNaN(value)).toBe(true);
      });
    });
  });

  describe('encodeBatch', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = ['Hello world', 'How are you?', 'Good morning'];
      const embeddings = await generator.encodeBatch(texts);

      expect(embeddings).toHaveLength(3);
      embeddings.forEach(embedding => {
        expect(embedding.vector.length).toBe(768);
      });
    });

    it('should handle empty array', async () => {
      const embeddings = await generator.encodeBatch([]);
      expect(embeddings).toEqual([]);
    });
  });

  describe('encodeSentence', () => {
    it('should generate sentence embedding', async () => {
      const embedding = await generator.encodeSentence('This is a complete sentence.');

      expect(embedding).toBeDefined();
      expect(embedding.vector.length).toBe(768);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical embeddings', async () => {
      const emb1 = await generator.encode('Hello world');
      const similarity = generator.cosineSimilarity(emb1, emb1);

      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should return value between -1 and 1', async () => {
      const emb1 = await generator.encode('Hello world');
      const emb2 = await generator.encode('Goodbye moon');

      const similarity = generator.cosineSimilarity(emb1, emb2);

      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('custom configuration', () => {
    it('should accept custom model name', async () => {
      const customGenerator = new EmbeddingGenerator('custom-model', 512);
      const embedding = await customGenerator.encode('Hello');

      expect(embedding.model).toBe('custom-model');
      expect(embedding.dimension).toBe(512);
      expect(embedding.vector.length).toBe(512);
    });
  });
});
