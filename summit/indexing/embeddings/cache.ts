export class EmbeddingCache {
  private mem = new Map<string, number[]>();
  get(key: string): number[] | undefined { return this.mem.get(key); }
  put(key: string, vec: number[]): void { this.mem.set(key, vec); }
}
