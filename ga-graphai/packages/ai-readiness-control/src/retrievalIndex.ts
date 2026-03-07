import { RetrievalDocument } from "./types.js";

export class RetrievalIndex {
  private readonly documents = new Map<string, RetrievalDocument>();

  add(doc: RetrievalDocument): void {
    if (this.documents.has(doc.id)) {
      throw new Error(`Document already indexed: ${doc.id}`);
    }
    this.documents.set(doc.id, doc);
  }

  markRefreshed(id: string, refreshedAt = new Date().toISOString()): void {
    const existing = this.documents.get(id);
    if (!existing) {
      throw new Error(`Document not found: ${id}`);
    }
    this.documents.set(id, { ...existing, lastRefreshedAt: refreshedAt });
  }

  dueForRefresh(now: string = new Date().toISOString()): RetrievalDocument[] {
    const nowMs = new Date(now).getTime();
    return Array.from(this.documents.values()).filter((doc) => {
      if (!doc.lastRefreshedAt) return true;
      const deltaMinutes = (nowMs - new Date(doc.lastRefreshedAt).getTime()) / (1000 * 60);
      return deltaMinutes >= doc.refreshIntervalMinutes;
    });
  }

  get(id: string): RetrievalDocument | undefined {
    return this.documents.get(id);
  }
}
