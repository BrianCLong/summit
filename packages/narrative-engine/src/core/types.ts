export type RelationshipType = 'ally' | 'rival' | 'neutral' | 'family';

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
