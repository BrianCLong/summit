/**
 * Cross-encoder models for re-ranking search results
 * Provides more accurate relevance scoring than bi-encoders
 */

import type { CrossEncoderModel } from '../types.js';
import { AutoTokenizer, AutoModelForSequenceClassification } from '@xenova/transformers';

export class TransformerCrossEncoder implements CrossEncoderModel {
  readonly name: string;

  private tokenizer: any;
  private model: any;
  private ready: boolean = false;

  constructor(modelName: string = 'cross-encoder/ms-marco-MiniLM-L-6-v2') {
    this.name = modelName;
  }

  async initialize(): Promise<void> {
    if (this.ready) return;

    try {
      console.log(`Loading cross-encoder: ${this.name}`);

      this.tokenizer = await AutoTokenizer.from_pretrained(this.name);
      this.model = await AutoModelForSequenceClassification.from_pretrained(
        this.name,
      );

      this.ready = true;
      console.log(`Cross-encoder ${this.name} ready`);
    } catch (error) {
      console.error(`Failed to initialize cross-encoder ${this.name}:`, error);
      throw error;
    }
  }

  async rerank(
    query: string,
    candidates: Array<{ id: string; text: string }>,
    topK?: number,
  ): Promise<Array<{ id: string; score: number }>> {
    await this.initialize();

    try {
      const scores: Array<{ id: string; score: number }> = [];

      for (const candidate of candidates) {
        const inputs = await this.tokenizer(query, candidate.text, {
          padding: true,
          truncation: true,
          max_length: 512,
          return_tensors: 'pt',
        });

        const output = await this.model(inputs);
        const logits = output.logits;

        // Get the relevance score (typically the first logit for binary classification)
        const score = Array.isArray(logits.data)
          ? logits.data[0]
          : logits.data;

        scores.push({
          id: candidate.id,
          score: typeof score === 'number' ? score : parseFloat(score),
        });
      }

      // Sort by score descending
      scores.sort((a, b) => b.score - a.score);

      // Return top K if specified
      return topK ? scores.slice(0, topK) : scores;
    } catch (error) {
      console.error('Cross-encoder reranking failed:', error);
      throw error;
    }
  }
}

export class CohereCrossEncoder implements CrossEncoderModel {
  readonly name: string = 'cohere-rerank';

  private apiKey: string;
  private model: string;
  private baseURL: string = 'https://api.cohere.ai/v1';

  constructor(apiKey: string, model: string = 'rerank-english-v3.0') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async rerank(
    query: string,
    candidates: Array<{ id: string; text: string }>,
    topK?: number,
  ): Promise<Array<{ id: string; score: number }>> {
    try {
      const response = await fetch(`${this.baseURL}/rerank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          query,
          documents: candidates.map((c) => c.text),
          top_n: topK || candidates.length,
          return_documents: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cohere rerank error: ${response.status} ${error}`);
      }

      const data = await response.json();

      // Map results back to original IDs
      return data.results.map((result: any) => ({
        id: candidates[result.index].id,
        score: result.relevance_score,
      }));
    } catch (error) {
      console.error('Cohere reranking failed:', error);
      throw error;
    }
  }
}

/**
 * Simple BM25-based re-ranker as a fallback
 */
export class BM25CrossEncoder implements CrossEncoderModel {
  readonly name: string = 'bm25-rerank';

  private k1: number = 1.5;
  private b: number = 0.75;

  constructor(k1: number = 1.5, b: number = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  async rerank(
    query: string,
    candidates: Array<{ id: string; text: string }>,
    topK?: number,
  ): Promise<Array<{ id: string; score: number }>> {
    const queryTerms = this.tokenize(query);

    // Calculate average document length
    const docLengths = candidates.map((c) => this.tokenize(c.text).length);
    const avgDocLength =
      docLengths.reduce((sum, len) => sum + len, 0) / docLengths.length;

    // Calculate BM25 scores
    const scores = candidates.map((candidate, idx) => {
      const docTokens = this.tokenize(candidate.text);
      const docLength = docTokens.length;

      let score = 0;
      for (const term of queryTerms) {
        const tf = docTokens.filter((t) => t === term).length;
        const idf = this.calculateIDF(term, candidates);

        const numerator = tf * (this.k1 + 1);
        const denominator =
          tf + this.k1 * (1 - this.b + this.b * (docLength / avgDocLength));

        score += idf * (numerator / denominator);
      }

      return { id: candidate.id, score };
    });

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    return topK ? scores.slice(0, topK) : scores;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }

  private calculateIDF(
    term: string,
    documents: Array<{ id: string; text: string }>,
  ): number {
    const docCount = documents.length;
    const docsWithTerm = documents.filter((doc) =>
      this.tokenize(doc.text).includes(term),
    ).length;

    return Math.log((docCount - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1);
  }
}
