import { Document, Chunk } from '../data-model/types';

export class ChunkingService {

  chunkDocument(doc: Document, chunkSize: number = 1000, overlap: number = 200): Chunk[] {
    const text = doc.text;
    const chunks: Chunk[] = [];
    let offset = 0;

    // Very simple character-based chunking for MVP
    // Should be replaced with token-based splitter (e.g. TikToken) later

    while (offset < text.length) {
      const end = Math.min(offset + chunkSize, text.length);
      const chunkText = text.substring(offset, end);

      chunks.push({
        id: `${doc.id}-chunk-${chunks.length}`,
        tenantId: doc.tenantId,
        documentId: doc.id,
        text: chunkText,
        offset: offset,
        metadata: { ...doc.metadata, chunkIndex: chunks.length }
      });

      offset += (chunkSize - overlap);
      if (offset >= text.length) break;
    }

    return chunks;
  }
}
