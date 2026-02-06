/**
 * Covert Influence Surface - Plugin Types
 */

export interface IntegritySignal {
  artifact_id: string;
  artifact_hash: string;
  modality: 'text' | 'image' | 'video' | 'audio';
  scores: {
    ai_generated: number;
    manipulated: number;
    spoof: number;
  };
  confidence: number;
  provider: string;
  model_id: string;
  evidence_ids: string[];
}

export interface NarrativeItem {
  narrative_id: string;
  summary: string;
  topics: string[];
  actors: string[];
  channels: string[];
  risk_score: number;
  provider: string;
  evidence_ids: string[];
}

export interface CISPlugin {
  id: string;
  name: string;
  type: 'IntegrityOracle' | 'NarrativeIntel';
  initialize(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export interface IntegrityOracle extends CISPlugin {
  type: 'IntegrityOracle';
  analyze(artifactId: string, content: unknown): Promise<IntegritySignal>;
}

export interface NarrativeIntel extends CISPlugin {
  type: 'NarrativeIntel';
  fetchFeed(since?: Date): Promise<NarrativeItem[]>;
}
