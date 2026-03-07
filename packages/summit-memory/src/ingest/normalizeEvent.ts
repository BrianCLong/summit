export interface RawMemoryEvent {
  entityId: string;
  title?: string;
  summary?: string;
  body?: string;
  eventTime?: string;
  ingestTime?: string;
  confidence?: number;
  policyTags?: string[];
  provenanceRefs?: Array<{
    sourceId: string;
    sourceType: string;
    uri?: string;
  }>;
}

export interface NormalizedMemoryEvent {
  entityId: string;
  title?: string;
  summary?: string;
  body?: string;
  eventTime: string;
  ingestTime: string;
  confidence: number;
  policyTags: string[];
  provenanceRefs: Array<{
    sourceId: string;
    sourceType: string;
    uri?: string;
  }>;
}

/**
 * Normalize incomplete/raw input into a deterministic event envelope.
 */
export function normalizeEvent(input: RawMemoryEvent): NormalizedMemoryEvent {
  return {
    entityId: input.entityId,
    title: input.title,
    summary: input.summary,
    body: input.body,
    eventTime: input.eventTime ?? new Date().toISOString(),
    ingestTime: input.ingestTime ?? new Date().toISOString(),
    confidence: input.confidence ?? 0.5,
    policyTags: input.policyTags ?? [],
    provenanceRefs: input.provenanceRefs ?? []
  };
}
