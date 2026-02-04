import { Document, Chunk, ConnectorContext } from '../data-model/types.js';
import EmbeddingService from '../services/EmbeddingService.js';

export class EmbeddingStage {
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  async embedChunks(chunks: Chunk[], ctx: ConnectorContext): Promise<Chunk[]> {
    if (chunks.length === 0) return chunks;

    ctx.logger?.info({ count: chunks.length }, 'Generating embeddings for chunks');

    try {
      const texts = chunks.map(c => c.text);
      // Batch size is handled inside EmbeddingService (default 10)
      // But we can also chunk here if needed to avoid massive payloads

      const embeddings = await this.embeddingService.generateEmbeddings(texts);

      if (embeddings.length !== chunks.length) {
          ctx.logger?.warn({ expected: chunks.length, got: embeddings.length }, 'Embedding count mismatch');
      }

      // Assign embeddings back to chunks
      return chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index] || null
      }));

    } catch (e: any) {
      ctx.logger?.error({ error: e.message }, 'Failed to generate embeddings');
      // Decide if we fail hard or continue without embeddings
      // For RAG, no embedding means no retrieval, so better to fail or DLQ.
      throw e;
    }
  }
}
