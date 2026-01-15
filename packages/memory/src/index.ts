/**
 * @fileoverview Graph-backed memory system for Strands Agents
 * @module @intelgraph/strands-agents/memory
 */

export * from './redactor.js';

export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class MemoryStore {
  private store: Map<string, MemoryEntry> = new Map();

  add(entry: MemoryEntry): void {
    this.store.set(entry.id, entry);
  }

  get(id: string): MemoryEntry | undefined {
    return this.store.get(id);
  }

  search(query: string): MemoryEntry[] {
    return Array.from(this.store.values()).filter(e => e.content.includes(query));
  }
}
