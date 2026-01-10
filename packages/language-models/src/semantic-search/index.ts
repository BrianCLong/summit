/**
 * Semantic search
 */

import type { SemanticSearchResult } from '../types';
import { EmbeddingGenerator } from '../embeddings';
import { applyDeltaOperator, deriveDeltaParams, type DeltaParamConfig, type Vector } from '../deltaOperator';

export interface DeltaOperatorTelemetry {
  recordBeta: (beta: number) => void;
  recordProjectionMagnitude: (projectionMagnitude: number) => void;
  recordDeltaNorm: (deltaNorm: number) => void;
}

export interface SemanticSearchOptions {
  deltaOperatorEnabled?: boolean;
  deltaConfig?: DeltaParamConfig;
  telemetry?: DeltaOperatorTelemetry;
  embedder?: EmbeddingGenerator;
}

const defaultTelemetry: DeltaOperatorTelemetry = {
  recordBeta: () => {},
  recordProjectionMagnitude: () => {},
  recordDeltaNorm: () => {},
};

export class SemanticSearch {
  private embedder: EmbeddingGenerator;
  private index: Map<string, number[]> = new Map();
  private workingState?: Vector;
  private lastQuery?: string;
  private readonly deltaOperatorEnabled: boolean;
  private readonly deltaConfig: DeltaParamConfig;
  private readonly telemetry: DeltaOperatorTelemetry;

  constructor(options?: SemanticSearchOptions) {
    this.embedder = options?.embedder ?? new EmbeddingGenerator();
    const envFlag = typeof globalThis !== 'undefined'
      ? Boolean((globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.DELTA_OPERATOR_ENABLED === 'true')
      : false;
    this.deltaOperatorEnabled = options?.deltaOperatorEnabled ?? envFlag;
    this.deltaConfig = options?.deltaConfig ?? {};
    this.telemetry = options?.telemetry ?? defaultTelemetry;
  }

  /**
   * Index documents for semantic search
   */
  async indexDocuments(documents: Array<{ id: string; text: string }>): Promise<void> {
    for (const doc of documents) {
      const embedding = await this.embedder.encode(doc.text);
      this.index.set(doc.id, embedding.vector);
    }
  }

  /**
   * Search documents semantically
   */
  async search(
    query: string,
    documents: Array<{ id: string; text: string }>,
    topK: number = 5
  ): Promise<SemanticSearchResult[]> {
    const queryEmbedding = await this.embedder.encode(query);
    let queryVector = queryEmbedding.vector;
    const initialResults = this.scoreDocuments(queryVector, documents);
    if (this.deltaOperatorEnabled) {
      if (this.lastQuery !== query) {
        this.workingState = undefined;
      }
      this.lastQuery = query;
      const contextVectors = this.collectContextVectors(initialResults.slice(0, topK));
      if (contextVectors.length > 0) {
        const contextEmbedding = this.averageContext(contextVectors);
        const baselineConfidence = this.maxSimilarity(queryVector, contextVectors);
        const params = deriveDeltaParams({
          queryEmbedding: queryVector,
          retrievedContextEmbedding: contextEmbedding,
          confidence: baselineConfidence,
          config: this.deltaConfig,
        });
        const state = this.workingState ?? queryVector;
        const updatedState = applyDeltaOperator({
          X: state,
          k: params.k,
          v: params.v,
          beta: params.beta,
        });
        const nextVector = Array.isArray((updatedState as number[][])[0])
          ? (updatedState as number[][]).map((row) => row[0])
          : (updatedState as number[]);
        const projection = this.dot(params.k, state);
        this.workingState = nextVector;
        this.telemetry.recordBeta(params.beta);
        this.telemetry.recordProjectionMagnitude(Math.abs(projection));
        this.telemetry.recordDeltaNorm(this.deltaNorm(state, nextVector));
        queryVector = nextVector;
      }
    }

    return this.scoreDocuments(queryVector, documents).slice(0, topK);
  }

  /**
   * Calculate similarity between vectors
   */
  private calculateSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = this.dot(vec1, vec2);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

    return mag1 && mag2 ? dotProduct / (mag1 * mag2) : 0;
  }

  private collectContextVectors(results: SemanticSearchResult[]): number[][] {
    return results
      .map((result) => this.index.get(result.documentId))
      .filter((vec): vec is number[] => Array.isArray(vec));
  }

  private averageContext(vectors: number[][]): number[] {
    const dimension = vectors[0]?.length ?? 0;
    const accumulator = Array(dimension).fill(0);
    for (const vec of vectors) {
      for (let i = 0; i < dimension; i += 1) {
        accumulator[i] += vec[i] ?? 0;
      }
    }
    return accumulator.map((value) => value / (vectors.length || 1));
  }

  private maxSimilarity(queryVector: number[], vectors: number[][]): number {
    let max = 0;
    for (const vector of vectors) {
      max = Math.max(max, this.calculateSimilarity(queryVector, vector));
    }
    return max;
  }

  private dot(vec1: number[], vec2: number[]): number {
    return vec1.reduce((sum, val, idx) => sum + val * vec2[idx], 0);
  }

  private scoreDocuments(queryVector: number[], documents: Array<{ id: string; text: string }>): SemanticSearchResult[] {
    const results = documents.map((doc) => {
      const docVector = this.index.get(doc.id);
      const score = docVector
        ? this.calculateSimilarity(queryVector, docVector)
        : 0;

      return {
        documentId: doc.id,
        score,
        text: doc.text,
      };
    });

    return results.sort((a, b) => b.score - a.score);
  }

  private deltaNorm(previous: number[], next: number[]): number {
    const length = Math.min(previous.length, next.length);
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      const diff = next[i] - previous[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
}
