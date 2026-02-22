/**
 * CIS/PIE Shared Contracts
 * Defines core types for NAEF, CIG, and PIE.
 */

export interface NAEFEvent {
  tenant_id: string;
  event_id: string;
  event_time: string; // ISO8601
  source: string;
  artifact: {
    type: 'text' | 'image' | 'audio' | 'video' | 'link';
    hash: string;
    uri_ref?: string;
    mime?: string;
    size?: number;
  };
  actor_ref?: string;
  channel_ref?: string;
  claims?: string[];
  topics?: string[];
  entities?: string[];
  integrity_signals?: Array<{
    source: string;
    score?: number;
    metadata?: Record<string, any>;
  }>;
  audience_refs?: string[];
  provenance: {
    source_pointer: string;
    ingestion_run_id: string;
  };
}

export interface CIGSnapshotRef {
  snapshot_id: string;
  tenant_id: string;
  timestamp: string;
}

export interface PIEScore {
  persona_id: string;
  integrity_score: number; // 0-1
  confidence: number; // 0-1
  explanations: string[];
}
