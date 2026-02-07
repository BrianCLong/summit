export type ContextChunk = {
  id: string;
  content: string;
  meta?: Record<string, unknown>;
};

export type ContextQuery = (chunk: ContextChunk) => boolean;

export class ContextStore {
  private readonly chunks = new Map<string, ContextChunk>();

  add(chunk: ContextChunk): void {
    this.chunks.set(chunk.id, chunk);
  }

  get(id: string): ContextChunk | undefined {
    return this.chunks.get(id);
  }

  list(): ContextChunk[] {
    return Array.from(this.chunks.values());
  }

  search(predicate: ContextQuery): ContextChunk[] {
    return this.list().filter(predicate);
  }

  slice(ids: string[]): ContextChunk[] {
    return ids
      .map((id) => this.chunks.get(id))
      .filter((chunk): chunk is ContextChunk => Boolean(chunk));
  }
}
