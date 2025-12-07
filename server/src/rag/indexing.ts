import { Document, DocumentChunk } from '../data-model/types.js';
import { chunkText } from './chunking.js';
import { v4 as uuidv4 } from 'uuid';
import { pg } from '../db/pg.js';
import { Logger } from 'pino';

// Stub for Embedding Service
async function generateEmbedding(text: string): Promise<number[]> {
  // In a real implementation, call OpenAI or local model
  return new Array(1536).fill(0).map(() => Math.random());
}

export class RagIndexer {
  constructor(private logger: Logger) {}

  async indexDocument(doc: Document) {
    this.logger.info({ docId: doc.id }, 'Indexing document for RAG');

    // 1. Chunk
    const textChunks = chunkText(doc.text);

    // 2. Embed & Create Chunk Objects
    const chunks: DocumentChunk[] = [];
    for (let i = 0; i < textChunks.length; i++) {
      const text = textChunks[i];
      const embedding = await generateEmbedding(text);

      chunks.push({
        id: uuidv4(),
        tenantId: doc.tenantId,
        documentId: doc.id,
        text,
        embedding,
        tokenCount: text.length / 4, // Approx
        offset: i,
        metadata: { source: doc.source },
        entityIds: doc.entityIds
      });
    }

    // 3. Persist
    await this.saveChunks(chunks);
    this.logger.info({ docId: doc.id, chunks: chunks.length }, 'Document indexed');
  }

  private async saveChunks(chunks: DocumentChunk[]) {
    // Should use COPY or batch insert
    for (const chunk of chunks) {
      // Need to format vector for pgvector
      const vectorStr = `[${chunk.embedding?.join(',')}]`;

      await pg.none(
        `INSERT INTO document_chunks (id, tenant_id, document_id, text, token_count, "offset", metadata, entity_ids, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)`,
        [
          chunk.id,
          chunk.tenantId,
          chunk.documentId,
          chunk.text,
          chunk.tokenCount,
          chunk.offset,
          JSON.stringify(chunk.metadata),
          chunk.entityIds,
          vectorStr
        ]
      );
    }
  }
}
