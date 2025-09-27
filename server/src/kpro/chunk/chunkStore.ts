import crypto from 'crypto';
import {
  ChunkRecord,
  DocumentRecord,
} from '../types.js';

export interface ChunkStore {
  deleteByDocumentIds(ids: string[]): Promise<number>;
  getImpactedDocuments(removedIds: string[]): Promise<DocumentRecord[]>;
  replaceChunks(documentId: string, chunks: ChunkRecord[]): Promise<void>;
  listChunks(documentId: string): Promise<ChunkRecord[]>;
}

export interface ChunkingStrategy {
  chunk(document: DocumentRecord): Promise<ChunkRecord[]>;
}

export class SimpleTextChunkingStrategy implements ChunkingStrategy {
  constructor(private embedding: (text: string) => Promise<number[]>) {}

  private tokenize(text: string): string[] {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length === 0) return [text];
    const chunks: string[] = [];
    let current = '';
    for (const sentence of sentences) {
      if ((current + ' ' + sentence).trim().length > 400) {
        if (current) chunks.push(current.trim());
        current = sentence;
      } else {
        current = `${current} ${sentence}`.trim();
      }
    }
    if (current) chunks.push(current.trim());
    return chunks;
  }

  async chunk(document: DocumentRecord): Promise<ChunkRecord[]> {
    const texts = this.tokenize(document.text);
    const chunks: ChunkRecord[] = [];
    let index = 0;
    for (const text of texts) {
      const embedding = await this.embedding(text);
      chunks.push({
        id: crypto.createHash('sha1').update(`${document.id}:${index}:${text}`).digest('hex'),
        documentId: document.id,
        text,
        embedding,
        version: document.version,
      });
      index++;
    }
    return chunks;
  }
}

export class InMemoryChunkStore implements ChunkStore {
  private documents = new Map<string, DocumentRecord>();
  private chunks = new Map<string, ChunkRecord[]>();

  registerDocument(document: DocumentRecord, chunks: ChunkRecord[]): void {
    this.documents.set(document.id, document);
    this.chunks.set(document.id, chunks);
  }

  linkDocuments(documentId: string, relatedIds: string[]): void {
    const doc = this.documents.get(documentId);
    if (!doc) throw new Error(`Document ${documentId} not registered`);
    doc.relatedIds = Array.from(new Set([...(doc.relatedIds ?? []), ...relatedIds]));
    this.documents.set(documentId, doc);
  }

  async deleteByDocumentIds(ids: string[]): Promise<number> {
    let removed = 0;
    for (const id of ids) {
      if (this.documents.delete(id)) {
        removed++;
      }
      this.chunks.delete(id);
    }
    return removed;
  }

  async getImpactedDocuments(removedIds: string[]): Promise<DocumentRecord[]> {
    const impacted: DocumentRecord[] = [];
    for (const doc of this.documents.values()) {
      if (!doc.relatedIds || doc.relatedIds.length === 0) continue;
      if (doc.relatedIds.some((id) => removedIds.includes(id))) {
        impacted.push({ ...doc });
      }
    }
    return impacted;
  }

  async replaceChunks(documentId: string, chunks: ChunkRecord[]): Promise<void> {
    if (!this.documents.has(documentId)) {
      throw new Error(`Document ${documentId} not found`);
    }
    this.chunks.set(documentId, chunks.map((c) => ({ ...c })));
    const doc = this.documents.get(documentId)!;
    this.documents.set(documentId, { ...doc, version: doc.version + 1 });
  }

  async listChunks(documentId: string): Promise<ChunkRecord[]> {
    return (this.chunks.get(documentId) ?? []).map((c) => ({ ...c }));
  }
}
