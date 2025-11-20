/**
 * Sentence-BERT and other transformer-based embedding models
 * Supports local inference using ONNX Runtime
 */

import { AutoTokenizer, AutoModel, env } from '@xenova/transformers';
import type { EmbeddingModel } from '../types.js';

// Configure transformers to use local models
env.localModelPath = './models/';
env.allowRemoteModels = true;

export class SentenceTransformerModel implements EmbeddingModel {
  readonly name: string;
  readonly dimension: number;

  private tokenizer: any;
  private model: any;
  private ready: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(
    modelName: string = 'Xenova/all-MiniLM-L6-v2',
    dimension: number = 384,
  ) {
    this.name = modelName;
    this.dimension = dimension;
  }

  async warmup(): Promise<void> {
    if (this.ready) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initialize();
    await this.initPromise;
  }

  private async initialize(): Promise<void> {
    try {
      console.log(`Loading model: ${this.name}`);

      this.tokenizer = await AutoTokenizer.from_pretrained(this.name);
      this.model = await AutoModel.from_pretrained(this.name);

      // Warmup with a sample text
      await this.embed(['warmup text']);

      this.ready = true;
      console.log(`Model ${this.name} ready`);
    } catch (error) {
      console.error(`Failed to initialize model ${this.name}:`, error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async embed(texts: string[]): Promise<number[][]> {
    await this.warmup();

    try {
      const embeddings: number[][] = [];

      for (const text of texts) {
        const inputs = await this.tokenizer(text, {
          padding: true,
          truncation: true,
          max_length: 512,
        });

        const { last_hidden_state } = await this.model(inputs);

        // Mean pooling
        const embedding = this.meanPooling(
          last_hidden_state,
          inputs.attention_mask,
        );

        // Normalize
        const normalized = this.normalize(embedding);

        embeddings.push(Array.from(normalized.data));
      }

      return embeddings;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  async embedQuery(query: string): Promise<number[]> {
    const embeddings = await this.embed([query]);
    return embeddings[0];
  }

  private meanPooling(lastHiddenState: any, attentionMask: any): any {
    // Apply mean pooling to get sentence embedding
    const maskExpanded = attentionMask.unsqueeze(-1).expand(lastHiddenState.size());
    const sumEmbeddings = lastHiddenState.mul(maskExpanded).sum(1);
    const sumMask = maskExpanded.sum(1).clamp(1e-9, Infinity);
    return sumEmbeddings.div(sumMask);
  }

  private normalize(tensor: any): any {
    // L2 normalization
    const norm = tensor.norm(2, -1, true).clamp(1e-12, Infinity);
    return tensor.div(norm);
  }
}

export class OpenAIEmbeddingModel implements EmbeddingModel {
  readonly name: string;
  readonly dimension: number;

  private apiKey: string;
  private ready: boolean = true;
  private baseURL: string = 'https://api.openai.com/v1';

  constructor(
    apiKey: string,
    modelName: string = 'text-embedding-3-small',
    dimension: number = 1536,
  ) {
    this.apiKey = apiKey;
    this.name = modelName;
    this.dimension = dimension;
  }

  async warmup(): Promise<void> {
    // API models don't need warmup
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.name,
          input: texts,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      console.error('OpenAI embedding failed:', error);
      throw error;
    }
  }

  async embedQuery(query: string): Promise<number[]> {
    const embeddings = await this.embed([query]);
    return embeddings[0];
  }
}

export class CohereEmbeddingModel implements EmbeddingModel {
  readonly name: string;
  readonly dimension: number;

  private apiKey: string;
  private ready: boolean = true;
  private baseURL: string = 'https://api.cohere.ai/v1';

  constructor(
    apiKey: string,
    modelName: string = 'embed-english-v3.0',
    dimension: number = 1024,
  ) {
    this.apiKey = apiKey;
    this.name = modelName;
    this.dimension = dimension;
  }

  async warmup(): Promise<void> {
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch(`${this.baseURL}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.name,
          texts,
          input_type: 'search_document',
          embedding_types: ['float'],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cohere API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.embeddings.float;
    } catch (error) {
      console.error('Cohere embedding failed:', error);
      throw error;
    }
  }

  async embedQuery(query: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseURL}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.name,
          texts: [query],
          input_type: 'search_query',
          embedding_types: ['float'],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cohere API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.embeddings.float[0];
    } catch (error) {
      console.error('Cohere query embedding failed:', error);
      throw error;
    }
  }
}
