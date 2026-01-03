import { z } from 'zod';
import type { Pool } from 'pg';
import type { DocumentChunk, RetrievedChunk, VectorStore } from './types.js';

const upsertInputSchema = z.array(
  z.object({
    id: z.string(),
    documentId: z.string(),
    content: z.string(),
    position: z.number(),
    startOffset: z.number(),
    endOffset: z.number(),
    metadata: z.record(z.string(), z.any()).optional(),
    embedding: z.array(z.number()).optional(),
  })
);

export interface PgVectorStoreConfig {
  pool: Pool;
}

export class PgVectorStore implements VectorStore {
  private readonly pool: Pool;

  constructor(config: PgVectorStoreConfig) {
    this.pool = config.pool;
  }

  async upsert(chunks: DocumentChunk[], workspaceId: string, corpusVersion: string): Promise<void> {
    const parsed = upsertInputSchema.parse(chunks);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const chunk of parsed) {
        await client.query(
          `INSERT INTO rag_chunks (id, document_id, content, position, start_offset, end_offset, metadata, embedding_array, workspace_id, corpus_version)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, metadata = EXCLUDED.metadata, embedding_array = EXCLUDED.embedding_array, corpus_version = EXCLUDED.corpus_version`,
          [
            chunk.id,
            chunk.documentId,
            chunk.content,
            chunk.position,
            chunk.startOffset,
            chunk.endOffset,
            chunk.metadata ?? {},
            chunk.embedding ?? [],
            workspaceId,
            corpusVersion,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async similaritySearch(queryEmbedding: number[], topK: number, workspaceId?: string): Promise<RetrievedChunk[]> {
    const client = await this.pool.connect();
    try {
      const rows = await client.query(
        `SELECT id, document_id, content, position, start_offset, end_offset, metadata, embedding_array
         FROM rag_chunks
         WHERE ($1::text IS NULL OR workspace_id = $1)
         LIMIT 500`,
        [workspaceId ?? null]
      );

      const scored = rows.rows.map((row) => {
        const embedding: number[] = row.embedding_array ?? [];
        const score = this.cosineSimilarity(queryEmbedding, embedding);
        return {
          id: row.id,
          documentId: row.document_id,
          content: row.content,
          position: row.position,
          startOffset: row.start_offset,
          endOffset: row.end_offset,
          metadata: row.metadata ?? {},
          embedding,
          score,
        } as RetrievedChunk;
      });

      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((chunk) => ({ ...chunk, sourceId: chunk.documentId }));
    } finally {
      client.release();
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const length = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
  }
}

