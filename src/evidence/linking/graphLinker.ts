import { GraphEvidenceLink } from "./linkTypes.js";

// TODO(repo-validate): confirm GraphRAG edge names
export function linkEvidenceToEntity(evidenceId: string, entityId: string): GraphEvidenceLink & { evidenceId: string } {
  return {
    evidenceId,
    entityId,
    relation: "supports" as const,
    confidence: 1,
  };
}
