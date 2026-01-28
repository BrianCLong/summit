export type RelationshipType = 'ally' | 'rival' | 'neutral' | 'family';

export interface InfluenceCampaign {
  id: string;
  sponsor: string;
  objective: string;
  narratives: string[];
  channels: string[];
  targetAudiences: string[];
  intensity: number;
}

export interface CounterNarrativeStrategy {
  id: string;
  campaignId: string;
  approach: string;
  confidence: number;
  channelAlignment?: number;
  protectiveMeasures?: string[];
}

export interface InformationOperation {
  id: string;
  campaignId: string;
  tactic: string;
  amplification: number;
  deception: number;
  reach: number;
}

export interface Event {
  id: string;
  type: string;
  actorId: string;
  targetId?: string;
  intensity: number;
  timestamp?: number;
  payload?: Record<string, unknown>;
}

export interface ActorConfig {
  id: string;
  name: string;
  traits?: string[];
  mood?: number;
  resilience?: number;
  influence?: number;
}

export interface RelationshipConfig {
  sourceId: string;
  targetId: string;
  type?: RelationshipType;
  intensity?: number;
  trust?: number;
}

export interface SimConfig {
  initialTimestamp?: number;
  actors: ActorConfig[];
  relationships?: RelationshipConfig[];
  seedEvents?: Event[];
}

export interface StateUpdate {
  actorMood: Record<string, number>;
  triggeredEvents: Event[];
  narrativeLog: string[];
}

export interface StudioTickResult {
  timestamp: number;
  generatedEvents: Event[];
  counterNarrativeCoverage: Record<string, number>;
  operationEffectiveness: Record<string, number>;
  notes: string[];
}

// Market of Narratives Types

export interface IdentityCluster {
  id: string;
  name: string;
  values: string[]; // e.g., ["security-first", "institutional-trusting"]
  size: number; // 0.0 to 1.0, representing share of population
}

export interface NarrativeMarket {
  id: string;
  topic: string; // e.g., "Election Integrity"
  narrativeIds: string[];
  audienceSegments: string[]; // IdentityCluster IDs
}

export interface NarrativeAlignment {
  narrativeId: string;
  clusterId: string;
  score: number; // -1.0 to 1.0 (dissonance to resonance)
}

export interface MarketSnapshot {
  timestamp: number;
  marketId: string;
  narrativeShares: Record<string, number>; // NarrativeID -> Share (0.0 to 1.0)
  clusterSaturation: Record<string, number>; // ClusterID -> Saturation (0.0 to 1.0)
}

// --- Frame-First Strategy Types (2026-01-27) ---

export type ActorRole = 'INITIATOR' | 'VALIDATOR' | 'AMPLIFIER' | 'HYBRID';

export interface NarrativeFrame {
  id: string;
  invariantCore: string;
  embedding?: number[];
  keywords: string[];
  stabilityScore: number;
  lifespanDays: number;
}

export interface FrameAlignment {
  narrativeId: string;
  frameId: string;
  score: number;
}

export interface BaselineDrift {
  metric: string;
  driftScore: number;
  timeWindowDays: number;
}
