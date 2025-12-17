/**
 * BERT-based sentiment analysis model
 * Fine-tuned for domain-specific sentiment detection
 */

import { pipeline, type Pipeline } from '@xenova/transformers';
import type { SentimentScore, ModelConfig, AnalysisOptions } from '../core/types.js';

export class BertSentimentModel {
  private pipeline: Pipeline | null = null;
  private config: ModelConfig;
  private isInitialized = false;

  constructor(config: Partial<ModelConfig> = {}) {
    this.config = {
      modelName: config.modelName || 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      maxLength: config.maxLength || 512,
      batchSize: config.batchSize || 8,
      device: config.device || 'cpu',
      quantize: config.quantize ?? true,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.pipeline = await pipeline('sentiment-analysis', this.config.modelName, {
        quantized: this.config.quantize,
      });
      this.isInitialized = true;
      console.log(`BERT sentiment model initialized: ${this.config.modelName}`);
    } catch (error) {
      console.error('Failed to initialize BERT model:', error);
      throw new Error(`Model initialization failed: ${error}`);
    }
  }

  async analyzeSentiment(text: string, options: AnalysisOptions = {}): Promise<SentimentScore> {
    if (!this.isInitialized || !this.pipeline) {
      await this.initialize();
    }

    try {
      const result = await this.pipeline!(text, {
        truncation: true,
        max_length: this.config.maxLength,
      });

      // Transform Hugging Face output to our format
      return this.transformToSentimentScore(result);
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      throw new Error(`Sentiment analysis error: ${error}`);
    }
  }

  async analyzeBatch(texts: string[], options: AnalysisOptions = {}): Promise<SentimentScore[]> {
    if (!this.isInitialized || !this.pipeline) {
      await this.initialize();
    }

    const results: SentimentScore[] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);
      const batchResults = await Promise.all(
        batch.map(text => this.analyzeSentiment(text, options))
      );
      results.push(...batchResults);
    }

    return results;
  }

  private transformToSentimentScore(result: any): SentimentScore {
    // Default scores
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    // Handle different output formats
    if (Array.isArray(result)) {
      for (const item of result) {
        const label = item.label.toLowerCase();
        const score = item.score;

        if (label.includes('positive')) {
          positive = score;
        } else if (label.includes('negative')) {
          negative = score;
        } else if (label.includes('neutral')) {
          neutral = score;
        }
      }
    } else if (result.label) {
      const label = result.label.toLowerCase();
      if (label.includes('positive')) {
        positive = result.score;
        negative = 1 - result.score;
      } else if (label.includes('negative')) {
        negative = result.score;
        positive = 1 - result.score;
      }
    }

    // Normalize if needed
    const total = positive + negative + neutral;
    if (total > 0 && Math.abs(total - 1) > 0.01) {
      positive /= total;
      negative /= total;
      neutral /= total;
    }

    // Calculate compound score
    const compound = positive - negative;

    return {
      positive,
      negative,
      neutral,
      compound,
    };
  }

  getModelInfo(): ModelConfig {
    return { ...this.config };
  }

  async dispose(): Promise<void> {
    this.pipeline = null;
    this.isInitialized = false;
  }
}
