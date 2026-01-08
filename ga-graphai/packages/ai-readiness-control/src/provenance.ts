import { ProvenanceRecord } from "./types.js";

export class ProvenanceTracker {
  private readonly entries = new Map<string, ProvenanceRecord>();

  record(entry: ProvenanceRecord): void {
    if (!entry.artifactIds.length) {
      throw new Error("Provenance requires at least one source artifact id");
    }
    this.entries.set(entry.outputId, entry);
  }

  attachFeedback(outputId: string, feedback: ProvenanceRecord["feedback"]): void {
    const existing = this.entries.get(outputId);
    if (!existing) {
      throw new Error(`Provenance not found for output ${outputId}`);
    }
    this.entries.set(outputId, { ...existing, feedback });
  }

  get(outputId: string): ProvenanceRecord | undefined {
    return this.entries.get(outputId);
  }

  list(): ProvenanceRecord[] {
    return Array.from(this.entries.values());
  }
}
