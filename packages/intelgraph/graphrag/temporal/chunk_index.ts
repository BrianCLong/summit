import { Chunk } from './types';

export class ChunkIndex {
  private chunks: Map<string, Chunk> = new Map();

  constructor(initialChunks: Chunk[] = []) {
    initialChunks.forEach(chunk => this.chunks.set(chunk.chunkId, chunk));
  }

  async getChunks(chunkIds: string[]): Promise<Chunk[]> {
    return chunkIds
      .map(id => this.chunks.get(id))
      .filter((chunk): chunk is Chunk => chunk !== undefined);
  }

  addChunks(chunks: Chunk[]) {
    chunks.forEach(chunk => this.chunks.set(chunk.chunkId, chunk));
  }
}
