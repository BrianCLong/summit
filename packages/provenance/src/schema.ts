export interface SourceObject {
  id: string;
  sourceType: 'web' | 'social' | 'media' | 'document' | 'other';
  uri: string;
  capturedAt: string;
  hash: string;
  metadata: Record<string, unknown>;
  content?: string | Buffer; // Raw content or reference
}

export interface TransformRecord {
  id: string;
  transformName: string;
  inputs: string[]; // IDs of input objects
  outputs: string[]; // IDs of output objects
  parameters: Record<string, unknown>;
  performedAt: string;
  agentId?: string; // Who/what performed it
  modelId?: string; // If AI model used
}

export interface LineageEvent {
  eventId: string;
  eventType: 'ingest' | 'transform' | 'verify' | 'cite';
  timestamp: string;
  actorId: string;
  relatedObjects: string[]; // IDs of objects involved
  details: SourceObject | TransformRecord | Record<string, unknown>;
}

export interface CitationRecord {
  id: string;
  sourceId: string; // Reference to SourceObject
  claimId?: string; // Reference to specific claim in product
  text: string; // The formatted citation text
  format: 'summit-standard' | 'mla' | 'apa' | 'other';
  fields: {
    title?: string;
    author?: string;
    publicationDate?: string;
    accessDate: string;
    url?: string;
    aiService?: string; // If an AI summarizer was used
  };
}
