export interface EmbeddingResult {
  vector: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingsService {
  embedText(input: string | string[], opts?: any): Promise<EmbeddingResult[]>;
}

export class MockEmbeddingsService implements EmbeddingsService {
  async embedText(input: string | string[], opts?: any): Promise<EmbeddingResult[]> {
    const inputs = Array.isArray(input) ? input : [input];
    return inputs.map(text => ({
      vector: Array(1536).fill(0).map(() => Math.random()), // 1536 dim mock
      model: 'mock-embedding-v1',
      usage: {
        promptTokens: text.length / 4,
        totalTokens: text.length / 4
      }
    }));
  }
}
