import fetchFn from 'node-fetch';
import crypto from 'crypto';
import { VectorDocument, VectorIndexSnapshot } from '../types.js';

// Type declarations for web API types
type RequestInit = any;
type HeadersInit = any;
type Response = any;

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

const defaultFetch: FetchLike =
  typeof fetch !== 'undefined'
    ? fetch.bind(globalThis)
    : (fetchFn as unknown as FetchLike);

export interface VectorStoreAdapter {
  readonly name: string;
  removeByIds(ids: string[]): Promise<{ removed: string[] }>;
  fetchByIds(ids: string[]): Promise<VectorDocument[]>;
  upsert(documents: VectorDocument[]): Promise<void>;
  snapshot(): Promise<VectorIndexSnapshot>;
}

export class PineconeVectorStoreAdapter implements VectorStoreAdapter {
  readonly name = 'pinecone';
  private fetch: FetchLike;
  private baseUrl: string;
  private namespace?: string;
  private apiKey: string;

  constructor(options: {
    indexHost: string;
    apiKey: string;
    namespace?: string;
    fetch?: FetchLike;
  }) {
    if (!options.indexHost) {
      throw new Error('Pinecone indexHost is required');
    }
    if (!options.apiKey) {
      throw new Error('Pinecone apiKey is required');
    }
    this.apiKey = options.apiKey;
    this.namespace = options.namespace;
    this.baseUrl = `https://${options.indexHost}`.replace(/\/$/, '');
    this.fetch = options.fetch ?? defaultFetch;
  }

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Api-Key': this.apiKey,
    };
  }

  async removeByIds(ids: string[]): Promise<{ removed: string[] }> {
    if (!ids.length) {
      return { removed: [] };
    }
    const res = await this.fetch(`${this.baseUrl}/vectors/delete`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ ids, namespace: this.namespace }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pinecone delete failed: ${res.status} ${body}`);
    }
    return { removed: ids.slice() };
  }

  async fetchByIds(ids: string[]): Promise<VectorDocument[]> {
    if (!ids.length) return [];
    const res = await this.fetch(`${this.baseUrl}/vectors/fetch`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ ids, namespace: this.namespace }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pinecone fetch failed: ${res.status} ${body}`);
    }
    const data: any = await res.json();
    const vectors = data.vectors ?? {};
    return Object.keys(vectors).map((id) => ({
      id,
      values: vectors[id].values ?? [],
      metadata: vectors[id].metadata ?? {},
      namespace: this.namespace,
    }));
  }

  async upsert(documents: VectorDocument[]): Promise<void> {
    if (!documents.length) return;
    const res = await this.fetch(`${this.baseUrl}/vectors/upsert`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        namespace: this.namespace,
        vectors: documents.map((doc) => ({
          id: doc.id,
          values: doc.values,
          metadata: doc.metadata ?? {},
        })),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pinecone upsert failed: ${res.status} ${body}`);
    }
  }

  async snapshot(): Promise<VectorIndexSnapshot> {
    const ids: string[] = [];
    let next: string | undefined;
    do {
      const payload: Record<string, any> = {
        namespace: this.namespace,
        pagination: { limit: 1000 },
      };
      if (next) payload.pagination.next = next;
      const res = await this.fetch(`${this.baseUrl}/vectors/list`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Pinecone list failed: ${res.status} ${body}`);
      }
      const data: any = await res.json();
      ids.push(...(data.vectors ?? []).map((v: any) => v.id));
      next = data.pagination?.next;
    } while (next);
    ids.sort();
    return {
      adapter: this.name,
      ids,
      revision: crypto.createHash('sha1').update(ids.join('|')).digest('hex'),
    };
  }
}

export class WeaviateVectorStoreAdapter implements VectorStoreAdapter {
  readonly name = 'weaviate';
  private fetch: FetchLike;
  private baseUrl: string;
  private className: string;
  private apiKey?: string;

  constructor(options: {
    scheme?: string;
    host: string;
    className: string;
    apiKey?: string;
    fetch?: FetchLike;
  }) {
    if (!options.host) {
      throw new Error('Weaviate host is required');
    }
    if (!options.className) {
      throw new Error('Weaviate className is required');
    }
    this.baseUrl = `${options.scheme || 'https'}://${options.host}`.replace(
      /\/$/,
      '',
    );
    this.className = options.className;
    this.apiKey = options.apiKey;
    this.fetch = options.fetch ?? defaultFetch;
  }

  private headers(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
    return headers;
  }

  async removeByIds(ids: string[]): Promise<{ removed: string[] }> {
    const removed: string[] = [];
    for (const id of ids) {
      const res = await this.fetch(
        `${this.baseUrl}/v1/objects/${this.className}/${id}`,
        {
          method: 'DELETE',
          headers: this.headers(),
        },
      );
      if (!res.ok && res.status !== 404) {
        const body = await res.text();
        throw new Error(`Weaviate delete failed: ${res.status} ${body}`);
      }
      removed.push(id);
    }
    return { removed };
  }

  async fetchByIds(ids: string[]): Promise<VectorDocument[]> {
    const docs: VectorDocument[] = [];
    for (const id of ids) {
      const res = await this.fetch(
        `${this.baseUrl}/v1/objects/${this.className}/${id}`,
        {
          method: 'GET',
          headers: this.headers(),
        },
      );
      if (res.status === 404) continue;
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Weaviate fetch failed: ${res.status} ${body}`);
      }
      const data: any = await res.json();
      docs.push({
        id,
        values: data.vector ?? [],
        metadata: data.properties ?? {},
      });
    }
    return docs;
  }

  async upsert(documents: VectorDocument[]): Promise<void> {
    if (!documents.length) return;
    const res = await this.fetch(`${this.baseUrl}/v1/batch/objects`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        objects: documents.map((doc) => ({
          class: this.className,
          id: doc.id,
          properties: doc.metadata ?? {},
          vector: doc.values,
        })),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Weaviate upsert failed: ${res.status} ${body}`);
    }
  }

  async snapshot(): Promise<VectorIndexSnapshot> {
    const ids: string[] = [];
    let after: string | undefined;
    do {
      const res = await this.fetch(`${this.baseUrl}/v1/graphql`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          query: `{
            Get {
              ${this.className}(
                limit: 1000
                after: ${after ? `"${after}"` : 'null'}
              ) {
                _additional {
                  id
                  vectorWeights
                }
              }
            }
          }`,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Weaviate snapshot failed: ${res.status} ${body}`);
      }
      const data: any = await res.json();
      const batch: any[] = data?.data?.Get?.[this.className] ?? [];
      if (!Array.isArray(batch) || !batch.length) {
        after = undefined;
        break;
      }
      ids.push(
        ...batch.map((item: any) => item._additional?.id).filter(Boolean),
      );
      after = batch[batch.length - 1]?._additional?.id;
    } while (after);
    ids.sort();
    return {
      adapter: this.name,
      ids,
      revision: crypto.createHash('sha1').update(ids.join('|')).digest('hex'),
    };
  }
}
