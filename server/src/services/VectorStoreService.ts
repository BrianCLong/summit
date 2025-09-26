import fetch from 'node-fetch';
import logger from '../config/logger';

export interface VectorEmbeddingRecord {
  tenantId: string;
  nodeId: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface VectorSimilarityParams {
  tenantId: string;
  embedding: number[];
  topK?: number;
  minScore?: number;
}

export interface VectorSimilarityMatch {
  nodeId: string;
  score: number;
  embedding?: number[];
  metadata?: Record<string, any>;
}

class VectorStoreService {
  private baseUrl?: string;
  private apiKey?: string;
  private log = logger.child({ service: 'VectorStore' });

  constructor() {
    this.baseUrl = process.env.VECTOR_SERVICE_URL;
    this.apiKey = process.env.VECTOR_SERVICE_API_KEY;
    if (!this.baseUrl) {
      this.log.warn('Vector store integration disabled - VECTOR_SERVICE_URL not configured');
    }
  }

  isEnabled(): boolean {
    return Boolean(this.baseUrl);
  }

  private requireBaseUrl(): string {
    if (!this.baseUrl) {
      throw new Error('Vector store service URL is not configured');
    }
    return this.baseUrl.replace(/\/$/, '');
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  async upsertEmbeddings(records: VectorEmbeddingRecord[]): Promise<void> {
    if (!records.length) {
      return;
    }
    if (!this.isEnabled()) {
      this.log.debug('Skipping vector upsert because service is disabled');
      return;
    }

    const url = `${this.requireBaseUrl()}/embeddings/upsert`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({ records }),
      } as any);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Vector service responded with ${response.status}: ${text}`);
      }
    } catch (error) {
      this.log.error({ err: error }, 'Failed to upsert embeddings to vector service');
      throw error;
    }
  }

  async fetchEmbedding(tenantId: string, nodeId: string): Promise<VectorEmbeddingRecord | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const url = `${this.requireBaseUrl()}/embeddings/fetch`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({ tenantId, nodeId }),
      } as any);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Vector service fetch failed with ${response.status}: ${text}`);
      }

      const payload = (await response.json()) as { record?: VectorEmbeddingRecord };
      return payload?.record || null;
    } catch (error) {
      this.log.error({ err: error, tenantId, nodeId }, 'Failed to fetch embedding from vector service');
      throw error;
    }
  }

  async search(params: VectorSimilarityParams): Promise<VectorSimilarityMatch[]> {
    if (!this.isEnabled()) {
      throw new Error('Vector store service is not configured');
    }

    const { tenantId, embedding, topK = 5, minScore = 0 } = params;
    const url = `${this.requireBaseUrl()}/search`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          tenantId,
          queryVector: embedding,
          topK,
          minScore,
        }),
      } as any);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Vector service search failed with ${response.status}: ${text}`);
      }

      const payload = (await response.json()) as { matches: VectorSimilarityMatch[] };
      return payload?.matches || [];
    } catch (error) {
      this.log.error({ err: error }, 'Vector similarity search failed');
      throw error;
    }
  }
}

export const vectorStoreService = new VectorStoreService();
export default vectorStoreService;
