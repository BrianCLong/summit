import { describe, it, expect } from "vitest";
import { buildAdvisorAcceptedRemediation } from "../../epistemics/advisor/advisorFollowThrough";

describe("EIS golden: advisor follow-through", () => {
  it("builds a remediation record from an accepted advisor recommendation", () => {
    const recommendation = {
      rank: 1,
      action_type: "tighten_family_policy",
      confidence: "medium",
      scope_match: { alert_category_match: true, family_match: true, severity_match: true },
      evidence: { samples: 5, avg_score: 0.6, effective_rate: 0.8, clear_rate: 0.8, recurrence_rate: 0.1 },
      rationale: "Recommended because it matches the alert scope.",
      known_side_effects: ["mixed_signal_quality"],
    } as any;

    const remediation = buildAdvisorAcceptedRemediation(
      "alert_123",
      recommendation,
      { id: "analyst_bob", kind: "user" }
    );

    expect(remediation.remediation_id).toContain("rem_");
    expect(remediation.action_type).toBe("tighten_family_policy");
    expect(remediation.chosen_by.id).toBe("analyst_bob");
    expect(remediation.summary).toContain("Accepted doctrine advisor recommendation");
  });
});
