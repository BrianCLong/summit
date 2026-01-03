import crypto from 'crypto';
import { z } from 'zod';
import type { Chunker, DocumentChunk, Metadata } from './types.js';

const chunkConfigSchema = z.object({
  maxTokens: z.number().int().positive().default(400),
  overlap: z.number().int().nonnegative().default(40),
});

export interface ChunkerConfig {
  maxTokens?: number;
  overlap?: number;
}

export class RecursiveChunker implements Chunker {
  private readonly maxTokens: number;
  private readonly overlap: number;

  constructor(config: ChunkerConfig = {}) {
    const parsed = chunkConfigSchema.parse(config);
    this.maxTokens = parsed.maxTokens;
    this.overlap = parsed.overlap;
  }

  chunk(documentId: string, content: string, metadata: Metadata = {}): DocumentChunk[] {
    const tokens = this.tokenize(content);
    const chunks: DocumentChunk[] = [];
    let position = 0;

    for (let i = 0; i < tokens.length; i += this.maxTokens - this.overlap) {
      const slice = tokens.slice(i, i + this.maxTokens);
      const chunkText = slice.join(' ');
      const startOffset = this.locateOffset(tokens, i);
      const endOffset = this.locateOffset(tokens, i + slice.length);

      chunks.push({
        id: crypto.randomUUID(),
        documentId,
        content: chunkText,
        position,
        startOffset,
        endOffset,
        metadata,
      });
      position += 1;
    }

    return chunks;
  }

  private tokenize(text: string): string[] {
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
  }

  private locateOffset(tokens: string[], index: number): number {
    return tokens.slice(0, index).join(' ').length + (index > 0 ? 1 : 0);
  }
}

