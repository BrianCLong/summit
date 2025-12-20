import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import {
  InMemoryChunkStore,
  SimpleTextChunkingStrategy,
} from '../../src/kpro/chunk/chunkStore.js';
import type { VectorStoreAdapter } from '../../src/kpro/adapters/vectorStoreAdapter.js';
import type {
  ChunkRecord,
  DocumentRecord,
  VectorDocument,
} from '../../src/kpro/types.js';

type RetrievalMatch = {
  vectorId: string;
  chunkId: string;
  text: string;
  score: number;
};

export const deterministicEmbed = async (text: string): Promise<number[]> => {
  const normalized = text.toLowerCase();
  const terms = ['power', 'sensor', 'deployment', 'maintenance', 'ai'];
  const counts = terms.map((term) =>
    (normalized.match(new RegExp(term, 'g')) || []).length,
  );
  const lengthComponent = Math.max(1, Math.round(text.length / 25));
  const hash = crypto.createHash('sha1').update(text).digest('hex');
  const hashComponent = parseInt(hash.slice(0, 8), 16) % 997;
  return [...counts, lengthComponent, hashComponent];
};

class InMemoryVectorStore implements VectorStoreAdapter {
  readonly name = 'memory';
  private vectors = new Map<string, VectorDocument>();

  async removeByIds(ids: string[]): Promise<{ removed: string[] }> {
    const removed: string[] = [];
    for (const id of ids) {
      if (this.vectors.delete(id)) {
        removed.push(id);
      }
    }
    return { removed };
  }

  async fetchByIds(ids: string[]): Promise<VectorDocument[]> {
    return ids
      .map((id) => this.vectors.get(id))
      .filter((doc): doc is VectorDocument => Boolean(doc))
      .map((doc) => ({ ...doc, metadata: { ...doc.metadata } }));
  }

  async upsert(documents: VectorDocument[]): Promise<void> {
    for (const doc of documents) {
      this.vectors.set(doc.id, { ...doc, metadata: { ...doc.metadata } });
    }
  }

  async snapshot() {
    const ids = Array.from(this.vectors.keys()).sort();
    const revision = crypto
      .createHash('sha1')
      .update(ids.join('|'))
      .digest('hex');
    return { adapter: this.name, ids, revision };
  }

  queryByEmbedding(embedding: number[], topK: number): RetrievalMatch[] {
    const scored = Array.from(this.vectors.values()).map((doc) => ({
      doc,
      score: cosineSimilarity(doc.values, embedding),
    }));
    scored.sort((a, b) => {
      if (b.score === a.score) return a.doc.id.localeCompare(b.doc.id);
      return b.score - a.score;
    });
    return scored.slice(0, topK).map(({ doc, score }) => ({
      vectorId: doc.id,
      chunkId: String(doc.metadata?.chunkId ?? ''),
      text: String(doc.metadata?.text ?? ''),
      score,
    }));
  }
}

const cosineSimilarity = (a: number[], b: number[]): number => {
  const minLength = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < minLength; i++) {
    dot += a[i] * b[i];
    magA += a[i] ** 2;
    magB += b[i] ** 2;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

export class DataPlatformHarness {
  readonly chunkStore: InMemoryChunkStore;
  private readonly vectorStore: InMemoryVectorStore;
  private readonly chunking: SimpleTextChunkingStrategy;

  constructor(embeddingFn = deterministicEmbed) {
    this.chunkStore = new InMemoryChunkStore();
    this.vectorStore = new InMemoryVectorStore();
    this.chunking = new SimpleTextChunkingStrategy(embeddingFn);
  }

  async ingestDocument(id: string, text: string): Promise<{
    document: DocumentRecord;
    chunks: ChunkRecord[];
  }> {
    const document: DocumentRecord = { id, text, version: 1 };
    const chunks = await this.chunking.chunk(document);
    this.chunkStore.registerDocument(document, chunks);
    await this.vectorStore.upsert(
      chunks.map((chunk) => ({
        id: `${document.id}:${chunk.id}`,
        values: chunk.embedding,
        metadata: {
          documentId: document.id,
          chunkId: chunk.id,
          text: chunk.text,
        },
      })),
    );
    return { document, chunks };
  }

  async retrieve(question: string, topK = 3): Promise<{
    matches: RetrievalMatch[];
    chunkIds: string[];
  }> {
    const embedding = await deterministicEmbed(question);
    const matches = this.vectorStore.queryByEmbedding(embedding, topK);
    return { matches, chunkIds: matches.map((m) => m.chunkId) };
  }

  async ragAnswer(question: string, retrieval: { matches: RetrievalMatch[] }) {
    const evidence = retrieval.matches
      .map((match) => `${match.text} [${match.chunkId}]`)
      .join(' ');
    return {
      answer: `${question} → ${evidence}`,
      citations: retrieval.matches.map((match) => ({
        chunkId: match.chunkId,
        text: match.text,
      })),
    };
  }
}

export const loadFixtureText = async (relativePath: string): Promise<string> => {
  const resolved = path.resolve(process.cwd(), 'tests', relativePath);
  return fs.readFile(resolved, 'utf-8');
};

export const createDataPlatformHarness = () => new DataPlatformHarness();
