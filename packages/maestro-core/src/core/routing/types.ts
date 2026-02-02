export type ModelId = string;

export type ModelConfig = {
  id: ModelId;
  maxTokens: number;
  // rough relative cost multiplier (not dollars) used for comparisons
  costWeight: number;
  // rough capability score 0..1 (subjective but stable for routing)
  capability: number;
  // domains it is preferred for (optional)
  domains?: string[];
};

export type RouteDecision = {
  model: ModelConfig;
  reason: string;
};
