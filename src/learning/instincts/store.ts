export interface Instinct {
  pattern: string;
  confidence: number;
  source: 'manual' | 'import' | 'evolved';
  tags: string[];
}

/**
 * InstinctStore manages a collection of "instincts" (learned patterns).
 * This feature is gated by the SUMMIT_INSTINCTS environment variable.
 */
export class InstinctStore {
  private instincts: Instinct[] = [];

  constructor() {}

  /**
   * Adds a new instinct to the store if the feature is enabled.
   */
  addInstinct(instinct: Instinct): void {
    if (process.env.SUMMIT_INSTINCTS !== '1') return;
    this.instincts.push(instinct);
  }

  /**
   * Exports the instincts as a deterministic JSON string.
   */
  export(): string {
    const sorted = [...this.instincts].sort((a, b) =>
      a.pattern.localeCompare(b.pattern)
    );
    return JSON.stringify(sorted, null, 2);
  }

  /**
   * Imports instincts from a JSON string if the feature is enabled.
   */
  import(data: string): void {
    if (process.env.SUMMIT_INSTINCTS !== '1') return;
    try {
      const imported = JSON.parse(data) as Instinct[];
      if (Array.isArray(imported)) {
        this.instincts = imported;
      }
    } catch (e) {
      // ignore invalid data
    }
  }

  /**
   * Returns all instincts in the store.
   */
  getInstincts(): Instinct[] {
    return this.instincts;
  }

  /**
   * Simple baseline for evolving clusters by tag similarity.
   */
  evolve(): void {
    if (process.env.SUMMIT_INSTINCTS !== '1') return;
    // Logic for clustering and evolving instincts would go here.
    // This is a placeholder for the Innovation lane.
  }
}
