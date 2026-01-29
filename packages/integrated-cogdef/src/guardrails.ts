export type GuardrailPolicy = {
  item: "PLASSFCOG";
  allowed_uses: string[];      // defensive-only
  prohibited_uses: string[];   // must include influence/manipulation bans
};

export function defaultGuardrails(): GuardrailPolicy {
  return {
    item: "PLASSFCOG",
    allowed_uses: [
      "indicators_and_warnings",
      "resilience_training_tracking",
      "critical_dependency_protection"
    ],
    prohibited_uses: [
      "microtargeted_persuasion",
      "covert_influence_operations",
      "behavior_manipulation_tooling",
      "individual_psychometric_scoring_default"
    ]
  };
}
