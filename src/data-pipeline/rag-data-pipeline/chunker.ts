import { Chunk } from './pipeline';

export interface ChunkerConfig {
  maxTokens: number;
  overlap: number;
}

export class RAGChunker {
  constructor(private config: ChunkerConfig = { maxTokens: 500, overlap: 50 }) {}

  chunk(text: string, documentId: string = "doc"): Chunk[] {
    const chunks: Chunk[] = [];
    const chunkSize = this.config.maxTokens * 4;

    for (let i = 0; i < text.length; i += chunkSize - this.config.overlap * 4) {
      chunks.push({
        id: `chunk-${documentId}-${i}`,
        text: text.slice(i, i + chunkSize)
      });
    }
    return chunks;
  }
}
