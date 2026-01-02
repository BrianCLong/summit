import { getPostgresPool } from '../db/postgres.js';
import EmbeddingService from './EmbeddingService.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

interface Document {
  id: string;
  tenantId: string;
  sourceId?: string;
  title?: string;
  metadata?: Record<string, any>;
  content?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentChunk {
  id: string;
  documentId: string;
  tenantId: string;
  chunkIndex: number;
  content: string;
  metadata?: Record<string, any>;
  score?: number;
}

interface SearchOptions {
  limit?: number;
  threshold?: number;
  metadataFilter?: Record<string, any>;
  tenantId: string;
}

export class VectorStoreService {
  private static instance: VectorStoreService;
  private embeddingService: EmbeddingService;

  private constructor() {
    this.embeddingService = new EmbeddingService();
  }

  public static getInstance(): VectorStoreService {
    if (!VectorStoreService.instance) {
      VectorStoreService.instance = new VectorStoreService();
    }
    return VectorStoreService.instance;
  }

  /**
   * Ingest a document and chunk it
   * For now, a simple character splitter is used if content is provided.
   * In a real app, use a proper text splitter (RecursiveCharacterTextSplitter).
   */
  async ingestDocument(
    tenantId: string,
    data: {
      sourceId?: string;
      title?: string;
      content: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ documentId: string; chunkCount: number }> {
    const pool = getPostgresPool();
    const documentId = uuidv4();

    // 1. Chunk Content
    const chunks = this.chunkText(data.content);

    // 2. Generate Embeddings (Before transaction to avoid holding connection during external API call)
    const chunkEmbeddings = await this.embeddingService.generateEmbeddings(chunks);

    let storedCount = 0;

    // 3. Transaction: Insert Document + Chunks atomically
    await pool.withTransaction(async (client) => {
      // Insert Document
      await client.query(
        `INSERT INTO documents (id, tenant_id, source_id, title, content, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          documentId,
          tenantId,
          data.sourceId,
          data.title,
          data.content,
          data.metadata || {},
        ]
      );

      // Insert Chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        const embedding = chunkEmbeddings[i];
        const vectorString = `[${embedding.join(',')}]`;

        await client.query(
          `INSERT INTO document_chunks (
                  document_id, tenant_id, chunk_index, content, metadata, embedding
               ) VALUES ($1, $2, $3, $4, $5, $6::vector)`,
          [
            documentId,
            tenantId,
            i,
            chunkContent,
            data.metadata || {}, // Inherit doc metadata + specific chunk meta if needed
            vectorString,
          ]
        );
        storedCount++;
      }
    });

    logger.info({ tenantId, documentId, chunkCount: storedCount }, 'Document ingested');
    return { documentId, chunkCount: storedCount };
  }

  /**
   * Semantic Search
   */
  async search(
    query: string,
    options: SearchOptions
  ): Promise<DocumentChunk[]> {
    const { limit = 5, threshold = 0.7, metadataFilter, tenantId } = options;
    const pool = getPostgresPool();

    // 1. Generate Query Embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding({ text: query });
    const vectorString = `[${queryEmbedding.join(',')}]`;

    // 2. Construct Query
    // Note: cosine similarity is 1 - cosine distance.
    // <=> operator in pgvector is cosine distance.
    // So similarity = 1 - (embedding <=> query)
    // We want similarity > threshold => 1 - distance > threshold => distance < 1 - threshold

    let filterClause = 'tenant_id = $2';
    const params: any[] = [vectorString, tenantId];
    let paramIndex = 3;

    if (metadataFilter) {
      // Basic JSON containment support
      // For more complex filtering, we'd need dynamic query building
      filterClause += ` AND metadata @> $${paramIndex}`;
      params.push(metadataFilter);
      paramIndex++;
    }

    const sql = `
      SELECT
        id,
        document_id,
        tenant_id,
        chunk_index,
        content,
        metadata,
        1 - (embedding <=> $1::vector) as similarity
      FROM document_chunks
      WHERE ${filterClause}
      AND 1 - (embedding <=> $1::vector) > $${paramIndex}
      ORDER BY similarity DESC
      LIMIT $${paramIndex + 1}
    `;

    params.push(threshold, limit);
    const result = await pool.read(sql, params);

    return result.rows.map((row: any) => ({
      id: row.id,
      documentId: row.document_id,
      tenantId: row.tenant_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      metadata: row.metadata,
      score: row.similarity
    }));
  }

  /**
   * Delete Document
   */
  async deleteDocument(documentId: string, tenantId: string): Promise<boolean> {
    const pool = getPostgresPool();
    const result = await pool.write(
      'DELETE FROM documents WHERE id = $1 AND tenant_id = $2',
      [documentId, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Simple chunking helper
   * Split by double newline (paragraphs) first, then ensure max chunk size.
   * This is a naive implementation.
   */
  private chunkText(text: string, maxChars: number = 1000, overlap: number = 100): string[] {
    const chunks: string[] = [];

    // Split by paragraphs
    let rawChunks = text.split(/\n\s*\n/);

    // Merge small paragraphs, split large ones
    let currentChunk = '';

    for (const raw of rawChunks) {
      if ((currentChunk.length + raw.length) < maxChars) {
        currentChunk += (currentChunk ? '\n\n' : '') + raw;
      } else {
        if (currentChunk) chunks.push(currentChunk);

        // If raw itself is too big, hard split it
        if (raw.length > maxChars) {
          let start = 0;
          while (start < raw.length) {
            const end = Math.min(start + maxChars, raw.length);
            chunks.push(raw.slice(start, end));
            start = end - overlap; // Simple overlap
          }
          currentChunk = '';
        } else {
          currentChunk = raw;
        }
      }
    }

    if (currentChunk) chunks.push(currentChunk);

    return chunks;
  }
}
