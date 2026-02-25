import { TextPipeline } from '../text-pipeline.js';

// Mock global fetch
global.fetch = jest.fn();

describe('TextPipeline', () => {
  let pipeline: TextPipeline;

  beforeEach(() => {
    jest.clearAllMocks();
    pipeline = new TextPipeline({
      model: 'text-embedding-3-small',
      chunkSize: 500,
      chunkOverlap: 50,
      enableEntityExtraction: true,
      enableSentimentAnalysis: false,
      enableLanguageDetection: false,
    });
  });

  describe('embedText', () => {
    it('should generate text embedding', async () => {
      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: new Array(1536).fill(0.1), index: 0 }],
          usage: { total_tokens: 10 }
        }),
      });

      const embedding = await pipeline.embedText(
        'Sample OSINT intelligence text',
        'inv-123',
      );

      expect(embedding).toBeDefined();
      expect(embedding.modality).toBe('text');
      expect(embedding.vector).toHaveLength(1536);
    });
  });

  describe('extractEntities', () => {
    it('should extract email entities', async () => {
      const entities = await pipeline.extractEntities(
        'Contact us at test@example.com for more info.',
      );

      expect(entities.some((e: any) => e.type === 'EMAIL')).toBe(true);
      expect(entities.find((e: any) => e.type === 'EMAIL')?.text).toBe('test@example.com');
    });

    it('should extract URL entities', async () => {
      const entities = await pipeline.extractEntities(
        'Visit https://example.com for details.',
      );

      expect(entities.some((e: any) => e.type === 'URL')).toBe(true);
      expect(entities.find((e: any) => e.type === 'URL')?.text).toBe('https://example.com');
    });

    it('should extract IP addresses', async () => {
      const entities = await pipeline.extractEntities(
        'Server IP: 192.168.1.1',
      );

      expect(entities.some((e: any) => e.type === 'IP_ADDRESS')).toBe(true);
      expect(entities.find((e: any) => e.type === 'IP_ADDRESS')?.text).toBe('192.168.1.1');
    });
  });
});
