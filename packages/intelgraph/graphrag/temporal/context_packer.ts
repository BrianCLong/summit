import { ScoredChunk } from './scoring.js';

export class ContextPacker {
  static pack(chunks: ScoredChunk[], tokenBudget: number): ScoredChunk[] {
    const sortedChunks = [...chunks].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.chunkId.localeCompare(b.chunkId);
    });

    const packed: ScoredChunk[] = [];
    let currentTokens = 0;

    for (const chunk of sortedChunks) {
      if (chunk.score > 0 && currentTokens + chunk.tokenCount <= tokenBudget) {
        packed.push(chunk);
        currentTokens += chunk.tokenCount;
      }
    }

    return packed;
  }

  static serialize(packed: ScoredChunk[]): string {
    return packed
      .map(c => `[Chunk ${c.chunkId}] (Score: ${c.score.toFixed(4)})\n${c.text}`)
      .join('\n\n---\n\n');
  }
}
