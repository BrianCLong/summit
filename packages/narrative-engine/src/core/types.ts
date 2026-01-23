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
