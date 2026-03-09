import { describe, it, expect } from "vitest";
import { serveAlertRecommendations } from "../../epistemics/advisor/recommendationServer";

describe("EIS golden: playbook recommendation serving", () => {
  it("serves scoped remediation recommendations for a live doctrine alert", () => {
    const response = serveAlertRecommendations({
      alert: {
        alert_id: "alert_1",
        category: "family_brittleness",
        severity: "high",
        related_entities: {
          family_code: "burst_coordination_narratives",
        },
      } as any,
      stats: [
        {
          action_type: "tighten_family_policy",
          alert_category: "family_brittleness",
          target_family_code: "burst_coordination_narratives",
          severity: "high",
          samples: 6,
          avg_score: 0.62,
          effective_rate: 0.67,
          partial_rate: 0.17,
          ineffective_rate: 0.16,
          clear_rate: 0.67,
          recurrence_rate: 0.17,
          avg_posture_sensitivity_improvement: 0.08,
          avg_family_rank_improvement: 2.5,
          avg_recommendation_churn_improvement: 0.06,
          side_effect_flags: ["mixed_signal_quality"],
        },
        {
          action_type: "monitor_only",
          alert_category: "family_brittleness",
          target_family_code: "burst_coordination_narratives",
          severity: "high",
          samples: 5,
          avg_score: -0.20,
          effective_rate: 0.10,
          partial_rate: 0.20,
          ineffective_rate: 0.70,
          clear_rate: 0.20,
          recurrence_rate: 0.60,
          avg_posture_sensitivity_improvement: 0.01,
          avg_family_rank_improvement: 0.0,
          avg_recommendation_churn_improvement: 0.0,
          side_effect_flags: ["clears_but_not_durable"],
        },
      ],
    });

    expect(response.fallback_used).toBe(false);
    expect(response.recommendations[0].action_type).toBe("tighten_family_policy");
    expect(response.recommendations[0].confidence).toMatch(/medium|high/);
  });
});
