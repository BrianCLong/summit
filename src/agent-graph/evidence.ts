import crypto from "crypto";
import type { CapabilityGraph } from "./schema.js";

export interface ArtifactStamp {
  evidence_id: string;
  graph_version: string;
  hash: string;
}

export function generateEvidenceId(graphVersion: string, nodeIdOrEdgeId: string, sequence: string): string {
  // Pattern: EVID:<item-slug>:<graph-version>:<node-or-edge-id>:<sequence>
  return `EVID:agent-capability-graph:${graphVersion}:${nodeIdOrEdgeId}:${sequence}`;
}

export function createDeterministicStamp(graph: CapabilityGraph, planSequence: string): ArtifactStamp {
  const hash = crypto.createHash('sha256').update(JSON.stringify(graph)).digest('hex');
  const sequenceStr = planSequence.padStart(4, '0');
  const evidenceId = generateEvidenceId(graph.version, "plan", sequenceStr);
  return {
    evidence_id: evidenceId,
    graph_version: graph.version,
    hash,
  };
}
