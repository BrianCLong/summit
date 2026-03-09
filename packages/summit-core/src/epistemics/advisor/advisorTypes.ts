export type ServedRecommendation = {
  rank: number;

  action_type:
    | "tighten_family_policy"
    | "loosen_family_policy"
    | "reduce_global_bias"
    | "increase_global_bias"
    | "instance_override"
    | "collect_more_outcomes"
    | "monitor_only";

  confidence: "low" | "medium" | "high";

  scope_match: {
    alert_category_match: boolean;
    family_match: boolean;
    severity_match: boolean;
  };

  evidence: {
    samples: number;
    avg_score: number;
    effective_rate: number;
    clear_rate: number;
    recurrence_rate: number;
  };

  rationale: string;
  known_side_effects: string[];
};

export type AlertRecommendationResponse = {
  alert_id: string;
  generated_at: string;
  recommendations: ServedRecommendation[];
  fallback_used: boolean;
  summary: string;
};
