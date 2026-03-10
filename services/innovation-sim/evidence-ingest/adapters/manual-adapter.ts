/**
 * Manual Evidence Adapter
 *
 * For human-curated evidence that doesn't come from automated sources
 */

import { BaseEvidenceAdapter, type EvidenceEvent, type AdapterConfig } from "../base-adapter.js";

/**
 * Manual Evidence Entry
 */
export interface ManualEntry {
  /**
   * Unique ID
   */
  id: string;

  /**
   * Source description
   */
  source: string;

  /**
   * Optional URI for reference
   */
  uri?: string;

  /**
   * When this was observed/recorded
   */
  observedAt: string;

  /**
   * Curator's confidence (0.0-1.0)
   */
  confidence: number;

  /**
   * What this evidence asserts
   */
  assertions: Array<{
    type: "node_exists" | "edge_exists" | "attribute_value" | "temporal_event";
    subject: string;
    predicate?: string;
    object?: any;
    confidence?: number;
  }>;

  /**
   * Optional notes
   */
  notes?: string;

  /**
   * Optional tags
   */
  tags?: string[];
}

/**
 * Manual Evidence Adapter
 */
export class ManualAdapter extends BaseEvidenceAdapter {
  private entries: Map<string, ManualEntry> = new Map();

  constructor(config?: Partial<AdapterConfig>) {
    super({
      name: "manual-adapter",
      evidenceType: "manual",
      ...config,
    });
  }

  /**
   * Add manual entry
   */
  addEntry(entry: ManualEntry): void {
    // Validate
    if (!entry.id || entry.id.length === 0) {
      throw new Error("Entry ID is required");
    }

    if (!entry.source || entry.source.length === 0) {
      throw new Error("Entry source is required");
    }

    if (entry.confidence < 0.0 || entry.confidence > 1.0) {
      throw new Error(`Invalid confidence: ${entry.confidence}. Must be 0.0-1.0`);
    }

    if (!entry.assertions || entry.assertions.length === 0) {
      throw new Error("Entry must have at least one assertion");
    }

    this.entries.set(entry.id, entry);
  }

  /**
   * Add multiple entries
   */
  addEntries(entries: ManualEntry[]): void {
    for (const entry of entries) {
      this.addEntry(entry);
    }
  }

  /**
   * Remove entry
   */
  removeEntry(id: string): boolean {
    return this.entries.delete(id);
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): ManualEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get all entries
   */
  getAllEntries(): ManualEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Fetch evidence
   *
   * Query parameters:
   * - id: specific entry ID
   * - tags: filter by tags
   * - since: filter by observedAt >= since
   * - until: filter by observedAt <= until
   */
  async fetch(query: {
    id?: string;
    tags?: string[];
    since?: string;
    until?: string;
  }): Promise<EvidenceEvent[]> {
    let entries = Array.from(this.entries.values());

    // Filter by ID
    if (query.id) {
      const entry = this.entries.get(query.id);
      entries = entry ? [entry] : [];
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      entries = entries.filter(e =>
        e.tags && e.tags.some(tag => query.tags!.includes(tag))
      );
    }

    // Filter by time range
    if (query.since) {
      entries = entries.filter(e => e.observedAt >= query.since!);
    }

    if (query.until) {
      entries = entries.filter(e => e.observedAt <= query.until!);
    }

    // Convert to events
    return entries.map(entry => this.entryToEvent(entry));
  }

  /**
   * Convert manual entry to evidence event
   */
  private entryToEvent(entry: ManualEntry): EvidenceEvent {
    return {
      id: entry.id,
      type: "manual",
      source: entry.source,
      uri: entry.uri,
      observedAt: entry.observedAt,
      confidence: entry.confidence,
      assertions: entry.assertions,
      rawMetadata: {
        notes: entry.notes,
        tags: entry.tags,
      },
    };
  }

  /**
   * Load entries from JSON
   */
  loadFromJson(json: string): void {
    const entries = JSON.parse(json) as ManualEntry[];
    this.addEntries(entries);
  }

  /**
   * Export entries to JSON
   */
  exportToJson(): string {
    const entries = this.getAllEntries();
    return JSON.stringify(entries, null, 2);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEntries: number;
    totalAssertions: number;
    avgConfidence: number;
    tagCounts: Record<string, number>;
  } {
    const entries = this.getAllEntries();

    const totalEntries = entries.length;
    const totalAssertions = entries.reduce((sum, e) => sum + e.assertions.length, 0);
    const avgConfidence = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length
      : 0;

    const tagCounts: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.tags) {
        for (const tag of entry.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }

    return {
      totalEntries,
      totalAssertions,
      avgConfidence,
      tagCounts,
    };
  }
}
