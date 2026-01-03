import type { Citation, RetrievedChunk } from './types.js';

export class CitationBuilder {
  build(chunks: RetrievedChunk[]): Citation[] {
    return chunks.map((chunk) => ({
      sourceId: chunk.sourceId ?? chunk.documentId,
      snippet: chunk.content.slice(0, 300),
      offsets: { start: chunk.startOffset, end: chunk.endOffset },
      score: Number(chunk.score.toFixed(4)),
      title: chunk.metadata?.title as string | undefined,
      url: chunk.metadata?.url as string | undefined,
    }));
  }
}

