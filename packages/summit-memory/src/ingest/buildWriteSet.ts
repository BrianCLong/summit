import { randomUUID } from "node:crypto";
import type { GraphKind, MemoryTier, WriteSet } from "../types.js";
import type { NormalizedMemoryEvent } from "./normalizeEvent.js";

export interface BuildWriteSetOptions {
  graphIntents?: GraphKind[];
  tier?: MemoryTier;
  claimRefs?: string[];
  embeddingRefs?: string[];
  supersedes?: string[];
  conflictsWith?: string[];
}

/**
 * Build the canonical append-only ledger object for memory ingestion.
 */
export function buildWriteSet(
  event: NormalizedMemoryEvent,
  options: BuildWriteSetOptions = {}
): WriteSet {
  return {
    writeSetId: randomUUID(),
    entityId: event.entityId,
    memoryObjectId: randomUUID(),
    graphIntents: options.graphIntents ?? ["BG"],
    tier: options.tier ?? "episode",
    eventTime: event.eventTime,
    ingestTime: event.ingestTime,
    claimRefs: options.claimRefs ?? [],
    embeddingRefs: options.embeddingRefs ?? [],
    provenanceRefs: event.provenanceRefs,
    confidence: event.confidence,
    policyTags: event.policyTags,
    supersedes: options.supersedes ?? [],
    conflictsWith: options.conflictsWith ?? [],
    promotionState: "candidate",
    content: {
      title: event.title,
      summary: event.summary,
      body: event.body
    }
  };
}
