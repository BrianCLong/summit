import type { TokenEstimator } from './utils.js';
import { clampValue, cosineSimilarity, defaultTokenEstimator } from './utils.js';

export interface RetrievableDocument {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievedDocument extends RetrievableDocument {
  saliency: number;
  tokenEstimate: number;
}

export interface TokenAwareRetrievalOptions {
  embed: (text: string) => Promise<number[]> | number[];
  tokenBudget: number;
  estimateTokens?: TokenEstimator;
  minimumRelevance?: number;
}

export interface RetrievedContext {
  documents: RetrievedDocument[];
  usedTokens: number;
}

const DEFAULT_MIN_RELEVANCE = 0.5;

export class TokenAwareRetriever {
  private readonly embed: TokenAwareRetrievalOptions['embed'];
  private readonly tokenBudget: number;
  private readonly tokenEstimator: TokenEstimator;
  private readonly minimumRelevance: number;

  constructor(options: TokenAwareRetrievalOptions) {
    this.embed = options.embed;
    this.tokenBudget = options.tokenBudget;
    this.tokenEstimator = options.estimateTokens ?? defaultTokenEstimator;
    this.minimumRelevance = options.minimumRelevance ?? DEFAULT_MIN_RELEVANCE;
  }

  async retrieve(query: string, documents: RetrievableDocument[]): Promise<RetrievedContext> {
    const queryVector = await this.embed(query);
    const scored: RetrievedDocument[] = [];
    for (const document of documents) {
      const vector = await this.embed(document.text);
      const saliency = clampValue(cosineSimilarity(queryVector, vector), 0, 1);
      const tokenEstimate = this.tokenEstimator(document.text);
      if (saliency >= this.minimumRelevance) {
        scored.push({ ...document, saliency, tokenEstimate });
      }
    }

    scored.sort((a, b) => b.saliency - a.saliency);

    const selected: RetrievedDocument[] = [];
    let usedTokens = 0;
    for (const document of scored) {
      if (usedTokens + document.tokenEstimate > this.tokenBudget) {
        continue;
      }
      usedTokens += document.tokenEstimate;
      selected.push(document);
      if (usedTokens >= this.tokenBudget) {
        break;
      }
    }

    return { documents: selected, usedTokens };
  }
}
