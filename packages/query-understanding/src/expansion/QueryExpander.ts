/**
 * Query expansion for improved recall
 * Adds synonyms, related terms, and semantic expansions
 */

import type { ExpandedQuery } from '../types.js';
import * as natural from 'natural';
import { LRUCache } from 'lru-cache';

export class QueryExpander {
  private synonymCache: LRUCache<string, string[]>;
  private wordnet: typeof natural.WordNet;

  constructor() {
    this.synonymCache = new LRUCache<string, string[]>({
      max: 10000,
      ttl: 1000 * 60 * 60 * 24, // 24 hours
    });
    this.wordnet = new natural.WordNet();
  }

  /**
   * Expand query with synonyms and related terms
   */
  async expand(
    query: string,
    options: {
      maxExpansions?: number;
      includeSynonyms?: boolean;
      includeHyponyms?: boolean;
      includeHypernyms?: boolean;
    } = {},
  ): Promise<ExpandedQuery> {
    const {
      maxExpansions = 5,
      includeSynonyms = true,
      includeHyponyms = false,
      includeHypernyms = false,
    } = options;

    const tokens = this.tokenize(query);
    const synonymMap = new Map<string, string[]>();
    const expandedTerms: string[] = [];

    for (const token of tokens) {
      const expansions: string[] = [];

      // Get synonyms
      if (includeSynonyms) {
        const synonyms = await this.getSynonyms(token);
        expansions.push(...synonyms.slice(0, maxExpansions));
        synonymMap.set(token, synonyms);
      }

      // Get hyponyms (more specific terms)
      if (includeHyponyms) {
        const hyponyms = await this.getHyponyms(token);
        expansions.push(...hyponyms.slice(0, maxExpansions));
      }

      // Get hypernyms (more general terms)
      if (includeHypernyms) {
        const hypernyms = await this.getHypernyms(token);
        expansions.push(...hypernyms.slice(0, maxExpansions));
      }

      expandedTerms.push(...expansions);
    }

    // Create expanded query variations
    const expanded = this.createQueryVariations(
      query,
      tokens,
      synonymMap,
      maxExpansions,
    );

    return {
      original: query,
      expanded: [...new Set(expanded)],
      synonyms: synonymMap,
      related: [...new Set(expandedTerms)],
      method: 'wordnet',
    };
  }

  /**
   * Get synonyms for a word
   */
  private async getSynonyms(word: string): Promise<string[]> {
    const cached = this.synonymCache.get(word);
    if (cached) return cached;

    return new Promise((resolve) => {
      const synonyms: string[] = [];

      this.wordnet.lookup(word, (results: any[]) => {
        for (const result of results) {
          if (result.synonyms) {
            synonyms.push(...result.synonyms);
          }
        }

        const unique = [...new Set(synonyms)];
        this.synonymCache.set(word, unique);
        resolve(unique);
      });
    });
  }

  /**
   * Get hyponyms (more specific terms)
   */
  private async getHyponyms(word: string): Promise<string[]> {
    return new Promise((resolve) => {
      const hyponyms: string[] = [];

      this.wordnet.lookup(word, (results: any[]) => {
        for (const result of results) {
          if (result.hyponyms) {
            hyponyms.push(...result.hyponyms);
          }
        }
        resolve([...new Set(hyponyms)]);
      });
    });
  }

  /**
   * Get hypernyms (more general terms)
   */
  private async getHypernyms(word: string): Promise<string[]> {
    return new Promise((resolve) => {
      const hypernyms: string[] = [];

      this.wordnet.lookup(word, (results: any[]) => {
        for (const result of results) {
          if (result.hypernyms) {
            hypernyms.push(...result.hypernyms);
          }
        }
        resolve([...new Set(hypernyms)]);
      });
    });
  }

  /**
   * Create query variations by substituting synonyms
   */
  private createQueryVariations(
    originalQuery: string,
    tokens: string[],
    synonymMap: Map<string, string[]>,
    maxVariations: number,
  ): string[] {
    const variations: string[] = [originalQuery];

    // Create variations by replacing each token with its synonyms
    for (let i = 0; i < tokens.length && variations.length < maxVariations; i++) {
      const token = tokens[i];
      const synonyms = synonymMap.get(token) || [];

      for (const synonym of synonyms.slice(0, 2)) {
        if (variations.length >= maxVariations) break;

        const newTokens = [...tokens];
        newTokens[i] = synonym;
        variations.push(newTokens.join(' '));
      }
    }

    return variations;
  }

  /**
   * Tokenize query
   */
  private tokenize(query: string): string[] {
    const tokenizer = new natural.WordTokenizer();
    return tokenizer.tokenize(query.toLowerCase()) || [];
  }
}

/**
 * Embedding-based query expansion using semantic similarity
 */
export class SemanticQueryExpander {
  private embeddingModel: any;

  constructor(embeddingModel: any) {
    this.embeddingModel = embeddingModel;
  }

  /**
   * Expand query using semantic similarity
   */
  async expand(
    query: string,
    candidateTerms: string[],
    maxExpansions: number = 5,
  ): Promise<ExpandedQuery> {
    // Embed query and candidate terms
    const queryEmbedding = await this.embeddingModel.embedQuery(query);
    const termEmbeddings = await this.embeddingModel.embed(candidateTerms);

    // Compute similarities
    const similarities = termEmbeddings.map((embedding: number[], idx: number) => ({
      term: candidateTerms[idx],
      similarity: this.cosineSimilarity(queryEmbedding, embedding),
    }));

    // Sort by similarity and take top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topTerms = similarities.slice(0, maxExpansions).map((s) => s.term);

    return {
      original: query,
      expanded: [query, ...topTerms],
      synonyms: new Map(),
      related: topTerms,
      method: 'embedding',
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
