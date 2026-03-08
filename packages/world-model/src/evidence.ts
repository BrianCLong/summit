import { WorldEvent } from "./types.js";

export function generateEvidenceId(source: string, id: string): string {
  // Using stable hashing approach or deterministic formatting as required.
  return `EVID:${source}:${id}`;
}

export function validateEvidenceId(evidence_id: string): boolean {
  return evidence_id.startsWith("EVID:");
}
