export type NarrativeGeneratorMode = "rule-based" | "llm";

export interface RelationshipEdge {
  targetId: string;
  strength: number;
}

export interface EntityThemeVector {
  [theme: string]: number;
}

export interface SimulationEntity {
  id: string;
  name: string;
  type: "actor" | "group";
  alignment: "ally" | "neutral" | "opposition";
  influence: number;
  sentiment: number;
  volatility: number;
  resilience: number;
  themes: EntityThemeVector;
  relationships: RelationshipEdge[];
  metadata?: Record<string, unknown>;
}

export interface EntityDynamicState extends SimulationEntity {
  pressure: number;
  trend: "rising" | "falling" | "stable";
  lastEventId?: string;
  lastUpdatedTick: number;
  history: Array<{
    tick: number;
    sentiment: number;
    influence: number;
  }>;
}

export interface TimeVariantParameter {
  name: string;
  value: number;
  trend: "rising" | "falling" | "stable";
  history: Array<{
    tick: number;
    value: number;
  }>;
}

export type NarrativeEventType = "social" | "political" | "information" | "intervention" | "system";

export interface NarrativeEvent {
  id: string;
  type: NarrativeEventType;
  actorId?: string;
  targetIds?: string[];
  theme: string;
  intensity: number;
  sentimentShift?: number;
  influenceShift?: number;
  parameterAdjustments?: Array<{
    name: string;
    delta: number;
  }>;
  description: string;
  scheduledTick?: number;
  metadata?: Record<string, unknown>;
}

export interface StoryArc {
  theme: string;
  momentum: number;
  outlook: "improving" | "degrading" | "steady";
  confidence: number;
  keyEntities: string[];
  narrative: string;
}

export interface NarrativeNarration {
  mode: NarrativeGeneratorMode;
  summary: string;
  highlights: Array<{
    theme: string;
    text: string;
  }>;
  risks: string[];
  opportunities: string[];
}

export interface NarrativeState {
  id: string;
  name: string;
  tick: number;
  startedAt: Date;
  timestamp: Date;
  tickIntervalMinutes: number;
  themes: string[];
  entities: Record<string, EntityDynamicState>;
  parameters: Record<string, TimeVariantParameter>;
  arcs: StoryArc[];
  recentEvents: NarrativeEvent[];
  narrative: NarrativeNarration;
  metadata?: Record<string, unknown>;
}

export interface SimulationConfig {
  id: string;
  name: string;
  themes: string[];
  tickIntervalMinutes: number;
  initialEntities: SimulationEntity[];
  initialParameters?: Array<{ name: string; value: number }>;
  generatorMode?: NarrativeGeneratorMode;
  llmClient?: LLMClient;
  metadata?: Record<string, unknown>;
}

export interface LLMNarrativeRequest {
  state: NarrativeState;
  recentEvents: NarrativeEvent[];
}

export interface LLMClient {
  generateNarrative(request: LLMNarrativeRequest): Promise<string>;
}

export interface SimulationSummary {
  id: string;
  name: string;
  tick: number;
  themes: string[];
  activeEntities: number;
  activeEvents: number;
}
