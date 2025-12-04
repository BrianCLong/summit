import { OpenAI } from 'openai';
import logger from '../utils/logger.js';
import { applicationErrors } from '../monitoring/metrics.js';

export interface EmbeddingConfig {
  provider: 'openai' | 'huggingface' | 'local';
  apiKey?: string;
  model: string;
  dimension: number;
  batchSize: number;
  timeout: number;
  maxRetries: number;
}

export interface EmbeddingMetrics {
  totalEmbeddings: number;
  averageLatency: number;
  errorCount: number;
  batchCount: number;
}

export class EmbeddingService {
  private config: EmbeddingConfig;
  private metrics: EmbeddingMetrics;
  private openai: OpenAI;

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = {
      provider: (process.env.EMBEDDING_PROVIDER as 'openai' | 'huggingface' | 'local') || 'openai',
      apiKey: process.env.OPENAI_API_KEY || process.env.EMBEDDING_API_KEY,
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
      dimension: parseInt(process.env.EMBEDDING_DIMENSION || '3072'),
      batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '10'),
      timeout: parseInt(process.env.EMBEDDING_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.EMBEDDING_MAX_RETRIES || '3'),
      ...config,
    };

    this.metrics = {
      totalEmbeddings: 0,
      averageLatency: 0,
      errorCount: 0,
      batchCount: 0,
    };

    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(params: { text: string; model?: string }): Promise<number[]> {
    const { text, model = this.config.model } = params;

    if (!text || typeof text !== 'string') {
      throw new Error('Valid text string is required');
    }

    const startTime = Date.now();

    try {
      let embedding: number[];

      switch (this.config.provider) {
        case 'openai':
          embedding = await this.generateOpenAIEmbedding(text, model);
          break;
        case 'huggingface':
          embedding = await this.generateHuggingFaceEmbedding(text, model);
          break;
        case 'local':
          embedding = await this.generateLocalEmbedding(text, model);
          break;
        default:
          throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
      }

      const latency = Date.now() - startTime;
      this.updateMetrics(latency);

      logger.debug('Embedding generated', {
        provider: this.config.provider,
        model,
        textLength: text.length,
        dimension: embedding.length,
        latency,
      });

      return embedding;
    } catch (error: any) {
      this.metrics.errorCount++;
      // Check if applicationErrors exists before using it to avoid runtime errors if metrics not fully initialized
      if (applicationErrors) {
        applicationErrors.labels('embedding_service', 'GenerationError', 'error').inc();
      }

      logger.error('Embedding generation failed', {
        provider: this.config.provider,
        model,
        textLength: text.length,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[], model: string = this.config.model): Promise<number[][]> {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Valid array of texts is required');
    }

    const batches = this.createBatches(texts, this.config.batchSize);
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        const batchEmbeddings = await this.generateBatchEmbeddings(batch, model);
        allEmbeddings.push(...batchEmbeddings);

        this.metrics.batchCount++;

        logger.debug('Batch embeddings generated', {
          batchIndex: i + 1,
          totalBatches: batches.length,
          batchSize: batch.length,
          provider: this.config.provider,
        });
      } catch (error: any) {
        logger.error('Batch embedding generation failed', {
          batchIndex: i + 1,
          batchSize: batch.length,
          error: error.message,
        });

        // Continue with individual processing for failed batch
        for (const text of batch) {
          try {
            const embedding = await this.generateEmbedding({ text, model });
            allEmbeddings.push(embedding);
          } catch (individualError: any) {
            logger.warn('Individual embedding failed, using zero vector', {
              textLength: text.length,
              error: individualError.message,
            });
            // Use zero vector as fallback
            allEmbeddings.push(new Array(this.config.dimension).fill(0));
          }
        }
      }
    }

    return allEmbeddings;
  }

  /**
   * Generate OpenAI embeddings
   */
  private async generateOpenAIEmbedding(text: string, model: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: model,
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error: any) {
       throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Generate batch OpenAI embeddings
   */
  private async generateBatchEmbeddings(texts: string[], model: string): Promise<number[][]> {
    if (this.config.provider !== 'openai') {
      // For other providers, fall back to individual processing
      const embeddings: number[][] = [];
      for (const text of texts) {
        const embedding = await this.generateEmbedding({ text, model });
        embeddings.push(embedding);
      }
      return embeddings;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: model,
        input: texts,
        encoding_format: 'float',
      });

      // Ensure order is preserved or map correctly if not
      return response.data.map(item => item.embedding);
    } catch (error: any) {
      throw new Error(`OpenAI Batch API error: ${error.message}`);
    }
  }

  /**
   * Generate HuggingFace embeddings (placeholder)
   */
  private async generateHuggingFaceEmbedding(text: string, model: string): Promise<number[]> {
    throw new Error('HuggingFace provider not yet implemented');
  }

  /**
   * Generate local embeddings (placeholder)
   */
  private async generateLocalEmbedding(text: string, model: string): Promise<number[]> {
    throw new Error('Local provider not yet implemented');
  }

  /**
   * Calculate semantic similarity between two texts
   */
  async calculateSimilarity(text1: string, text2: string, model?: string): Promise<number> {
    const [embedding1, embedding2] = await Promise.all([
      this.generateEmbedding({ text: text1, model }),
      this.generateEmbedding({ text: text2, model }),
    ]);

    return this.cosineSimilarity(embedding1, embedding2);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same dimensions');
    }

    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Find most similar texts from a corpus
   */
  async findSimilar(queryText: string, corpusTexts: string[], options: { topK?: number; threshold?: number; model?: string } = {}) {
    const { topK = 5, threshold = 0.0, model = this.config.model } = options;

    const queryEmbedding = await this.generateEmbedding({
      text: queryText,
      model,
    });
    const corpusEmbeddings = await this.generateEmbeddings(corpusTexts, model);

    const similarities = corpusEmbeddings.map((embedding, index) => ({
      index,
      text: corpusTexts[index],
      similarity: this.cosineSimilarity(queryEmbedding, embedding),
    }));

    return similarities
      .filter((item) => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Utility methods
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private updateMetrics(latency: number) {
    this.metrics.totalEmbeddings++;

    const currentAvg = this.metrics.averageLatency;
    this.metrics.averageLatency = currentAvg
      ? (currentAvg + latency) / 2
      : latency;
  }

  /**
   * Health check
   */
  getHealth() {
    return {
      status: 'healthy',
      provider: this.config.provider,
      model: this.config.model,
      dimension: this.config.dimension,
      metrics: {
        totalEmbeddings: this.metrics.totalEmbeddings,
        averageLatency: Math.round(this.metrics.averageLatency),
        errorCount: this.metrics.errorCount,
        batchCount: this.metrics.batchCount,
        successRate:
          this.metrics.totalEmbeddings > 0
            ? (
                ((this.metrics.totalEmbeddings - this.metrics.errorCount) /
                  this.metrics.totalEmbeddings) *
                100
              ).toFixed(1) + '%'
            : '100%',
      },
    };
  }

  /**
   * Test embedding generation
   */
  async test() {
    try {
      const testText = 'This is a test sentence for embedding generation.';
      const embedding = await this.generateEmbedding({ text: testText });

      return {
        success: true,
        dimension: embedding.length,
        sampleValues: embedding.slice(0, 5),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default EmbeddingService;
