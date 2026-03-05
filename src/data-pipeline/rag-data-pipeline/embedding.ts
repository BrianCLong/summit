import { Chunk } from './pipeline';
import * as crypto from 'crypto';

export class RAGEmbedding {
  async embed(chunks: Chunk[]): Promise<number[][]> {
    // deterministic mock embedding
    const dimension = 1536; // OpenAI ada-002 size
    return chunks.map(chunk => {
      // Create a deterministic pseudo-random sequence based on the chunk ID
      const hash = crypto.createHash('sha256').update(chunk.id).digest();
      return Array.from({ length: dimension }, (_, i) => {
        // Use the hash bytes cyclically to generate values between -0.5 and 0.5
        const byte = hash[i % hash.length];
        return (byte / 255) - 0.5;
      });
    });
  }
}
