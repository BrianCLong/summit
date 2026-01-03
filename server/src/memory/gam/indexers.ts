import MiniSearch from 'minisearch';
import { MemoryPage } from '../types.js';
import { RetrievalResult } from './types.js';

interface IndexDocument {
  id: string;
  sessionId: string;
  tenantId: string;
  text: string;
  memo?: string | null;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function embedText(text: string): number[] {
  const normalized = cleanText(text).toLowerCase();
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const vector = new Array(8).fill(0);
  tokens.forEach((token) => {
    let hash = 0;
    for (let i = 0; i < token.length; i += 1) {
      hash = (hash * 31 + token.charCodeAt(i)) % 997;
    }
    vector[hash % vector.length] += 1;
  });
  return vector;
}

class Bm25Index {
  private indices: Map<string, MiniSearch<IndexDocument>> = new Map();

  private getIndex(tenantId: string): MiniSearch<IndexDocument> {
    if (!this.indices.has(tenantId)) {
      this.indices.set(
        tenantId,
        new MiniSearch<IndexDocument>({
          fields: ['text', 'memo'],
          storeFields: ['id', 'sessionId', 'tenantId', 'memo'],
        }),
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.indices.get(tenantId)!;
  }

  add(page: MemoryPage, text: string): void {
    const index = this.getIndex(page.tenant_id);
    index.add({ id: page.id, sessionId: page.session_id, tenantId: page.tenant_id, text, memo: page.memo });
  }

  search(tenantId: string, query: string, k: number): RetrievalResult[] {
    const index = this.getIndex(tenantId);
    return index
      .search(query, { prefix: true })
      .slice(0, k)
      .map((result) => ({
        pageId: result.id,
        sessionId: (result as any).sessionId,
        tenantId: (result as any).tenantId,
        score: result.score ?? 0,
        retrieverType: 'bm25' as const,
        excerpt: query,
        memo: (result as any).memo,
      }));
  }
}

class DenseIndex {
  private store: Map<string, Array<{ page: MemoryPage; embedding: number[]; text: string }>> = new Map();

  add(page: MemoryPage, text: string, embedding: number[] | null | undefined): void {
    if (!embedding) return;
    if (!this.store.has(page.tenant_id)) {
      this.store.set(page.tenant_id, []);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.store.get(page.tenant_id)!.push({ page, embedding, text });
  }

  search(tenantId: string, query: string, k: number): RetrievalResult[] {
    const tenantStore = this.store.get(tenantId) ?? [];
    if (tenantStore.length === 0) return [];
    const queryEmbedding = embedText(query);
    return tenantStore
      .map(({ page, embedding, text }) => ({
        pageId: page.id,
        sessionId: page.session_id,
        tenantId: page.tenant_id,
        score: cosineSimilarity(queryEmbedding, embedding),
        retrieverType: 'dense' as const,
        excerpt: text.slice(0, 240),
        memo: page.memo,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

export class HybridIndex {
  private bm25 = new Bm25Index();

  private dense = new DenseIndex();

  private pageLookup: Map<string, MemoryPage> = new Map();

  addPage(page: MemoryPage, text: string, embedding: number[] | null | undefined): void {
    const cleaned = cleanText(text);
    if (this.pageLookup.has(page.id)) {
      return;
    }
    this.pageLookup.set(page.id, { ...page, raw_content: page.raw_content ?? {} });
    this.bm25.add(page, cleaned);
    this.dense.add(page, cleaned, embedding);
  }

  lookupPage(pageId: string, tenantId: string): MemoryPage | null {
    const page = this.pageLookup.get(pageId);
    if (!page || page.tenant_id !== tenantId) return null;
    return page;
  }

  search(actions: PlanActionInput[]): RetrievalResult[] {
    const results: RetrievalResult[] = [];
    actions.forEach((action) => {
      if (action.tool === 'bm25' && action.query) {
        results.push(...this.bm25.search(action.tenantId, action.query, action.k));
      }
      if (action.tool === 'dense' && action.query) {
        results.push(...this.dense.search(action.tenantId, action.query, action.k));
      }
      if (action.tool === 'page_id') {
        action.pageIds?.forEach((pageId) => {
          const page = this.lookupPage(pageId, action.tenantId);
          if (page) {
            results.push({
              pageId: page.id,
              sessionId: page.session_id,
              tenantId: page.tenant_id,
              score: 1,
              retrieverType: 'page_id',
              excerpt: typeof page.raw_content?.text === 'string' ? page.raw_content.text.slice(0, 240) : '',
              memo: page.memo,
            });
          }
        });
      }
    });
    const dedup = new Map<string, RetrievalResult>();
    results.forEach((r) => {
      const existing = dedup.get(r.pageId);
      if (!existing || existing.score < r.score) {
        dedup.set(r.pageId, r);
      }
    });
    return Array.from(dedup.values());
  }
}

export interface PlanActionInput {
  tool: 'bm25' | 'dense' | 'page_id';
  tenantId: string;
  query?: string;
  pageIds?: string[];
  k: number;
}
