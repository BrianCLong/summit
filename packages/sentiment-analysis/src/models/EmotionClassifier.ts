/**
 * Emotion classification using transformer models
 * Detects: anger, fear, joy, sadness, surprise, disgust, trust
 */

import { pipeline, type Pipeline } from '@xenova/transformers';
import type { EmotionScore, ModelConfig } from '../core/types.js';

export class EmotionClassifier {
  private pipeline: Pipeline | null = null;
  private config: ModelConfig;
  private isInitialized = false;

  constructor(config: Partial<ModelConfig> = {}) {
    this.config = {
      modelName: config.modelName || 'j-hartmann/emotion-english-distilroberta-base',
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
      this.pipeline = await pipeline('text-classification', this.config.modelName, {
        quantized: this.config.quantize,
      });
      this.isInitialized = true;
      console.log(`Emotion classifier initialized: ${this.config.modelName}`);
    } catch (error) {
      console.error('Failed to initialize emotion classifier:', error);
      throw new Error(`Emotion classifier initialization failed: ${error}`);
    }
  }

  async classifyEmotions(text: string): Promise<EmotionScore> {
    if (!this.isInitialized || !this.pipeline) {
      await this.initialize();
    }

    try {
      const result = await this.pipeline!(text, {
        truncation: true,
        max_length: this.config.maxLength,
        top_k: null, // Get all emotion scores
      });

      return this.transformToEmotionScore(result);
    } catch (error) {
      console.error('Emotion classification failed:', error);
      // Return neutral emotions on error
      return this.getNeutralEmotions();
    }
  }

  async classifyBatch(texts: string[]): Promise<EmotionScore[]> {
    if (!this.isInitialized || !this.pipeline) {
      await this.initialize();
    }

    const results: EmotionScore[] = [];

    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);
      const batchResults = await Promise.all(
        batch.map(text => this.classifyEmotions(text))
      );
      results.push(...batchResults);
    }

    return results;
  }

  private transformToEmotionScore(result: any): EmotionScore {
    const emotions: EmotionScore = {
      anger: 0,
      fear: 0,
      joy: 0,
      sadness: 0,
      surprise: 0,
      disgust: 0,
      trust: 0,
    };

    if (Array.isArray(result)) {
      for (const item of result) {
        const label = item.label.toLowerCase();
        const score = item.score;

        if (label.includes('anger')) {
          emotions.anger = score;
        } else if (label.includes('fear')) {
          emotions.fear = score;
        } else if (label.includes('joy') || label.includes('happy')) {
          emotions.joy = score;
        } else if (label.includes('sad')) {
          emotions.sadness = score;
        } else if (label.includes('surprise')) {
          emotions.surprise = score;
        } else if (label.includes('disgust')) {
          emotions.disgust = score;
        } else if (label.includes('trust') || label.includes('neutral')) {
          emotions.trust = score;
        }
      }
    }

    return emotions;
  }

  private getNeutralEmotions(): EmotionScore {
    return {
      anger: 0,
      fear: 0,
      joy: 0,
      sadness: 0,
      surprise: 0,
      disgust: 0,
      trust: 1,
    };
  }

  async dispose(): Promise<void> {
    this.pipeline = null;
    this.isInitialized = false;
  }
}
