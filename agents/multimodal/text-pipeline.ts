/**
 * Text Embedding Pipeline
 * Generates text embeddings using transformer models for OSINT fusion.
 * Supports OpenAI embeddings and local sentence-transformers.
 */

import { createHash } from 'crypto';
import pino from 'pino';

import type {
  TextEmbedding,
  ExtractedEntity,
  SentimentScore,
  EmbeddingModel,
  ProvenanceInfo,
} from './types.js';

const logger = pino({ name: 'text-pipeline' });

// Text Model Configurations
const TEXT_MODELS: Record<string, TextModelConfig> = {
  'text-embedding-3-small': {
    name: 'text-embedding-3-small',
    dimension: 1536,
    maxTokens: 8191,
    provider: 'openai',
    endpoint: '/v1/embeddings',
  },
  'text-embedding-3-large': {
    name: 'text-embedding-3-large',
    dimension: 3072,
    maxTokens: 8191,
    provider: 'openai',
    endpoint: '/v1/embeddings',
  },
  'all-MiniLM-L6-v2': {
    name: 'sentence-transformers/all-MiniLM-L6-v2',
    dimension: 384,
    maxTokens: 512,
    provider: 'local',
    endpoint: '/api/v1/embed',
  },
};

interface TextModelConfig {
  name: string;
  dimension: number;
  maxTokens: number;
  provider: 'openai' | 'local' | 'azure';
  endpoint: string;
}

export interface TextPipelineConfig {
  model: EmbeddingModel;
  apiUrl: string;
  apiKey?: string;
  batchSize: number;
  maxConcurrency: number;
  enableEntityExtraction: boolean;
  enableSentimentAnalysis: boolean;
  enableLanguageDetection: boolean;
  cacheEnabled: boolean;
  timeoutMs: number;
  chunkSize: number;
  chunkOverlap: number;
}

interface TextProcessingResult {
  embedding: number[];
  entities?: ExtractedEntity[];
  sentiment?: SentimentScore;
  language?: string;
  tokens: number;
  processingTime: number;
}

export class TextPipeline {
  private config: TextPipelineConfig;
  private modelConfig: TextModelConfig;
  private cache: Map<string, TextEmbedding> = new Map();
  private tokenizer: SimpleTokenizer;

  constructor(config: Partial<TextPipelineConfig> = {}) {
    this.config = {
      model: 'text-embedding-3-small',
      apiUrl: process.env.EMBEDDING_API_URL || 'https://api.openai.com',
      apiKey: process.env.OPENAI_API_KEY,
      batchSize: 20,
      maxConcurrency: 5,
      enableEntityExtraction: true,
      enableSentimentAnalysis: false,
      enableLanguageDetection: true,
      cacheEnabled: true,
      timeoutMs: 30000,
      chunkSize: 512,
      chunkOverlap: 50,
      ...config,
    };

    const modelKey = this.config.model as string;
    this.modelConfig = TEXT_MODELS[modelKey] || TEXT_MODELS['text-embedding-3-small'];
    this.tokenizer = new SimpleTokenizer();

    logger.info('Text Pipeline initialized', {
      model: this.config.model,
      dimension: this.modelConfig.dimension,
      provider: this.modelConfig.provider,
    });
  }

  /**
   * Generate embedding for a single text
   */
  async embedText(
    text: string,
    investigationId: string,
    sourceId?: string,
  ): Promise<TextEmbedding> {
    const startTime = Date.now();
    const textId = sourceId || this.generateTextId(text);

    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(textId);
      if (cached) {
        logger.debug('Cache hit for text embedding', { textId });
        return cached;
      }
    }

    try {
      // Validate and preprocess text
      const processedText = this.preprocessText(text);

      // Process text
      const result = await this.processText(processedText);

      const embedding: TextEmbedding = {
        id: textId,
        vector: result.embedding,
        dimension: this.modelConfig.dimension,
        model: this.config.model,
        modality: 'text',
        timestamp: new Date(),
        metadata: {
          sourceId: textId,
          sourceUri: `text://${textId}`,
          investigationId,
          confidence: this.calculateConfidence(result),
          processingTime: Date.now() - startTime,
          provenance: this.buildProvenance(startTime),
        },
        text: processedText,
        language: result.language,
        entities: result.entities,
        sentiment: result.sentiment,
      };

      // Cache the embedding
      if (this.config.cacheEnabled) {
        this.cache.set(textId, embedding);
      }

      logger.info('Text embedding generated', {
        textId,
        dimension: embedding.dimension,
        tokens: result.tokens,
        entityCount: result.entities?.length || 0,
        processingTimeMs: Date.now() - startTime,
      });

      return embedding;
    } catch (error) {
      logger.error('Failed to generate text embedding', {
        textId,
        textLength: text.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Batch embed multiple texts
   */
  async embedTextBatch(
    texts: string[],
    investigationId: string,
  ): Promise<TextEmbedding[]> {
    const startTime = Date.now();

    logger.info('Starting batch text embedding', {
      textCount: texts.length,
      batchSize: this.config.batchSize,
    });

    const results: TextEmbedding[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);

      try {
        // Use batch embedding API if available
        const batchEmbeddings = await this.processBatchEmbeddings(batch);

        for (let j = 0; j < batch.length; j++) {
          const text = batch[j];
          const embedding = batchEmbeddings[j];
          const textId = this.generateTextId(text);

          const textEmbedding: TextEmbedding = {
            id: textId,
            vector: embedding,
            dimension: this.modelConfig.dimension,
            model: this.config.model,
            modality: 'text',
            timestamp: new Date(),
            metadata: {
              sourceId: textId,
              sourceUri: `text://${textId}`,
              investigationId,
              confidence: 0.9,
              processingTime: 0,
              provenance: this.buildProvenance(startTime),
            },
            text: this.preprocessText(text),
          };

          results.push(textEmbedding);

          if (this.config.cacheEnabled) {
            this.cache.set(textId, textEmbedding);
          }
        }
      } catch (error) {
        logger.error('Batch embedding failed, falling back to individual', {
          batchStart: i,
          error: error instanceof Error ? error.message : 'Unknown',
        });

        // Fall back to individual processing
        for (let j = 0; j < batch.length; j++) {
          try {
            const embedding = await this.embedText(batch[j], investigationId);
            results.push(embedding);
          } catch (err) {
            errors.push({
              index: i + j,
              error: err instanceof Error ? err.message : 'Unknown',
            });
          }
        }
      }
    }

    logger.info('Batch text embedding completed', {
      totalTexts: texts.length,
      successCount: results.length,
      errorCount: errors.length,
      totalTimeMs: Date.now() - startTime,
    });

    return results;
  }

  /**
   * Chunk long text and embed each chunk
   */
  async embedLongText(
    text: string,
    investigationId: string,
    sourceId?: string,
  ): Promise<{
    chunks: TextEmbedding[];
    aggregateEmbedding: number[];
    chunkCount: number;
  }> {
    const startTime = Date.now();

    // Split into chunks
    const chunks = this.chunkText(text);

    logger.info('Chunking long text', {
      originalLength: text.length,
      chunkCount: chunks.length,
      chunkSize: this.config.chunkSize,
    });

    // Embed each chunk
    const chunkEmbeddings = await this.embedTextBatch(chunks, investigationId);

    // Aggregate embeddings (average)
    const aggregateEmbedding = this.averageEmbeddings(
      chunkEmbeddings.map((e) => e.vector),
    );

    return {
      chunks: chunkEmbeddings,
      aggregateEmbedding,
      chunkCount: chunks.length,
    };
  }

  /**
   * Extract entities from text using NLP
   */
  async extractEntities(text: string): Promise<ExtractedEntity[]> {
    // Simple entity extraction using regex patterns
    // In production, use spaCy, transformers, or similar NLP library
    const entities: ExtractedEntity[] = [];

    // Extract email addresses
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailPattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'EMAIL',
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        confidence: 0.95,
      });
    }

    // Extract phone numbers
    const phonePattern = /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
    while ((match = phonePattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'PHONE',
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        confidence: 0.9,
      });
    }

    // Extract URLs
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    while ((match = urlPattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'URL',
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        confidence: 0.95,
      });
    }

    // Extract IP addresses
    const ipPattern = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    while ((match = ipPattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'IP_ADDRESS',
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        confidence: 0.95,
      });
    }

    // Extract dates
    const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi;
    while ((match = datePattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'DATE',
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        confidence: 0.85,
      });
    }

    // Extract monetary values
    const moneyPattern = /\$[\d,]+(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|CAD)\b/gi;
    while ((match = moneyPattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'MONEY',
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        confidence: 0.9,
      });
    }

    return entities;
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text: string): Promise<SentimentScore> {
    // Simple sentiment analysis using keyword scoring
    // In production, use a proper sentiment model
    const positiveWords = new Set([
      'good', 'great', 'excellent', 'positive', 'success', 'happy', 'love',
      'wonderful', 'fantastic', 'amazing', 'best', 'perfect', 'brilliant',
    ]);
    const negativeWords = new Set([
      'bad', 'terrible', 'poor', 'negative', 'failure', 'sad', 'hate',
      'awful', 'horrible', 'worst', 'wrong', 'error', 'problem',
    ]);

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.has(word)) positiveCount++;
      if (negativeWords.has(word)) negativeCount++;
    }

    const total = positiveCount + negativeCount || 1;
    const positive = positiveCount / total;
    const negative = negativeCount / total;
    const neutral = 1 - (positive + negative);

    return {
      positive: Math.max(0, Math.min(1, positive)),
      negative: Math.max(0, Math.min(1, negative)),
      neutral: Math.max(0, Math.min(1, neutral)),
    };
  }

  /**
   * Find semantically similar texts
   */
  async findSimilarTexts(
    queryEmbedding: number[],
    candidateEmbeddings: TextEmbedding[],
    topK: number = 10,
    threshold: number = 0.7,
  ): Promise<Array<{ embedding: TextEmbedding; similarity: number }>> {
    const similarities = candidateEmbeddings.map((candidate) => ({
      embedding: candidate,
      similarity: this.cosineSimilarity(queryEmbedding, candidate.vector),
    }));

    return similarities
      .filter((s) => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Process single text through embedding API
   */
  private async processText(text: string): Promise<TextProcessingResult> {
    const startTime = Date.now();

    // Generate embedding
    const embedding = await this.callEmbeddingAPI(text);

    // Extract entities if enabled
    const entities = this.config.enableEntityExtraction
      ? await this.extractEntities(text)
      : undefined;

    // Analyze sentiment if enabled
    const sentiment = this.config.enableSentimentAnalysis
      ? await this.analyzeSentiment(text)
      : undefined;

    // Detect language
    const language = this.config.enableLanguageDetection
      ? this.detectLanguage(text)
      : undefined;

    const tokens = this.tokenizer.countTokens(text);

    return {
      embedding,
      entities,
      sentiment,
      language,
      tokens,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Process batch of texts through embedding API
   */
  private async processBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const processedTexts = texts.map((t) => this.preprocessText(t));

    if (this.modelConfig.provider === 'openai') {
      return this.callOpenAIBatchEmbedding(processedTexts);
    }

    // Fall back to individual processing for local models
    const embeddings: number[][] = [];
    for (const text of processedTexts) {
      embeddings.push(await this.callEmbeddingAPI(text));
    }
    return embeddings;
  }

  /**
   * Call embedding API for single text
   */
  private async callEmbeddingAPI(text: string): Promise<number[]> {
    if (this.modelConfig.provider === 'openai') {
      const embeddings = await this.callOpenAIBatchEmbedding([text]);
      return embeddings[0];
    }

    // Local model
    return this.callLocalEmbeddingAPI(text);
  }

  /**
   * Call OpenAI embeddings API
   */
  private async callOpenAIBatchEmbedding(texts: string[]): Promise<number[][]> {
    const url = `${this.config.apiUrl}${this.modelConfig.endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelConfig.name,
          input: texts,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
      }

      const result = await response.json();

      // Sort by index to ensure correct order
      const sorted = result.data.sort((a: any, b: any) => a.index - b.index);
      return sorted.map((item: any) => item.embedding);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Call local embedding API
   */
  private async callLocalEmbeddingAPI(text: string): Promise<number[]> {
    const url = `${this.config.apiUrl}${this.modelConfig.endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model: this.modelConfig.name,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Local embedding API error: ${response.status}`);
      }

      const result = await response.json();
      return result.embedding || result.data?.[0]?.embedding;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Preprocess text for embedding
   */
  private preprocessText(text: string): string {
    // Normalize whitespace
    let processed = text.replace(/\s+/g, ' ').trim();

    // Truncate if too long
    const maxChars = this.modelConfig.maxTokens * 4; // Rough estimate
    if (processed.length > maxChars) {
      processed = processed.slice(0, maxChars);
    }

    return processed;
  }

  /**
   * Chunk text into smaller pieces
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      const potentialChunk = currentChunk
        ? `${currentChunk} ${sentence}`
        : sentence;

      if (this.tokenizer.countTokens(potentialChunk) > this.config.chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk);
          // Add overlap
          const overlap = currentChunk.split(' ').slice(-this.config.chunkOverlap).join(' ');
          currentChunk = overlap + ' ' + sentence;
        } else {
          // Single sentence too long, split by words
          const words = sentence.split(' ');
          for (let i = 0; i < words.length; i += this.config.chunkSize / 2) {
            chunks.push(words.slice(i, i + this.config.chunkSize / 2).join(' '));
          }
          currentChunk = '';
        }
      } else {
        currentChunk = potentialChunk;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Average multiple embeddings
   */
  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    if (embeddings.length === 1) return embeddings[0];

    const dimension = embeddings[0].length;
    const result = new Array(dimension).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dimension; i++) {
        result[i] += embedding[i];
      }
    }

    for (let i = 0; i < dimension; i++) {
      result[i] /= embeddings.length;
    }

    // Normalize
    const norm = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < dimension; i++) {
        result[i] /= norm;
      }
    }

    return result;
  }

  /**
   * Simple language detection
   */
  private detectLanguage(text: string): string {
    // Very simple heuristic - in production use langdetect or similar
    const lowerText = text.toLowerCase();

    // Check for common language-specific characters
    if (/[а-яё]/i.test(text)) return 'ru';
    if (/[一-龥]/.test(text)) return 'zh';
    if (/[ぁ-んァ-ン]/.test(text)) return 'ja';
    if (/[가-힣]/.test(text)) return 'ko';
    if (/[أ-ي]/.test(text)) return 'ar';

    // Default to English
    return 'en';
  }

  /**
   * Generate unique text ID
   */
  private generateTextId(text: string): string {
    return createHash('sha256')
      .update(text)
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(result: TextProcessingResult): number {
    let confidence = 0.85;

    // Adjust based on token count
    if (result.tokens > 10 && result.tokens < this.modelConfig.maxTokens) {
      confidence += 0.05;
    }

    // Adjust based on entity extraction
    if (result.entities && result.entities.length > 0) {
      const avgEntityConf = result.entities.reduce((sum, e) => sum + e.confidence, 0) /
        result.entities.length;
      confidence = Math.max(confidence, avgEntityConf);
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Build provenance information
   */
  private buildProvenance(startTime: number): ProvenanceInfo {
    return {
      extractorName: 'TextPipeline',
      extractorVersion: '1.0.0',
      modelName: this.modelConfig.name,
      modelVersion: '1.0',
      processingParams: {
        model: this.config.model,
        provider: this.modelConfig.provider,
        chunkSize: this.config.chunkSize,
        enableEntityExtraction: this.config.enableEntityExtraction,
      },
      errors: [],
      warnings: [],
    };
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get pipeline statistics
   */
  getStats(): {
    model: string;
    dimension: number;
    cacheSize: number;
    config: TextPipelineConfig;
  } {
    return {
      model: this.config.model,
      dimension: this.modelConfig.dimension,
      cacheSize: this.cache.size,
      config: this.config,
    };
  }
}

/**
 * Simple tokenizer for estimating token counts
 */
class SimpleTokenizer {
  countTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  tokenize(text: string): string[] {
    return text.split(/\s+/);
  }
}

export default TextPipeline;
