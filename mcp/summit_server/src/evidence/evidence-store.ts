import type {
  EvidenceBundle,
  EvidenceEvent,
  PolicyDecision,
  ToolIndexEntry,
} from '../types.js';
import { hashJson } from '../utils/hash.js';
import { stableSortValue } from '../utils/stable-json.js';

export class EvidenceStore {
  private events: EvidenceEvent[] = [];
  private policyDecisions: PolicyDecision[] = [];
  private toolSchemas: ToolIndexEntry[] = [];

  recordEvent(event: EvidenceEvent): void {
    this.events = [...this.events, event].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );
  }

  recordPolicy(decision: PolicyDecision): void {
    this.policyDecisions = [...this.policyDecisions, decision];
  }

  recordToolSchema(entry: ToolIndexEntry): void {
    const exists = this.toolSchemas.some((schema) => schema.id === entry.id);
    if (!exists) {
      this.toolSchemas = [...this.toolSchemas, entry].sort((a, b) =>
        a.id.localeCompare(b.id),
      );
    }
  }

  exportBundle(sessionId: string): EvidenceBundle {
    const stepsHash = hashJson(stableSortValue(this.events));
    const policyHash = hashJson(stableSortValue(this.policyDecisions));
    const toolSchemasHash = hashJson(stableSortValue(this.toolSchemas));
    const manifest = {
      sessionId,
      generatedAt: new Date().toISOString(),
      toolSchemasHash,
      stepsHash,
      policyHash,
    };
    const checksums = {
      manifest: hashJson(manifest),
      steps: stepsHash,
      policyDecisions: policyHash,
      toolSchemasUsed: toolSchemasHash,
    };

    return {
      manifest,
      steps: this.events,
      toolSchemasUsed: this.toolSchemas,
      policyDecisions: this.policyDecisions,
      checksums,
    };
  }
}
