export type EmotionLabel = "anger" | "fear" | "resentment" | "betrayal" | "hope" | "neutral";

export interface NarrativeFrame {
  id: string;
  storyline: string;
  ideologicalAnchor: string;
  emotionalDriver: EmotionLabel;
  sourceIds: string[];
}

export interface BeliefState {
  id: string;
  statement: string;
  certainty: number;
  emotionalValence: number;
  narrativeFrameId: string;
  extractedAt: string;
}

export interface PerceivedActor {
  actorId: string;
  perceivedRole: string;
  trustLevel: number;
  moralFraming: string;
}

export interface PerceptionState {
  id: string;
  audienceId: string;
  platform: string;
  community: string;
  beliefIds: string[];
  computedAt: string;
}

export interface DriftVector {
  audienceId: string;
  metric: string;
  startValue: number;
  endValue: number;
  delta: number;
  direction: "up" | "down" | "flat";
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value));
}
