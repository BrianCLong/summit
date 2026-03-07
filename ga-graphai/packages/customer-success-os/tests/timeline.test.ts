import { describe, expect, it } from "vitest";
import { summarizeTimeline } from "../src/timeline";
import { TimelineEvent } from "../src/types";

describe("summarizeTimeline", () => {
  it("derives insights and stalled onboarding time from timeline events", () => {
    const now = new Date();
    const events: TimelineEvent[] = [
      { id: "1", tenantId: "t", kind: "deployment.published", timestamp: now, metadata: {} },
      {
        id: "2",
        tenantId: "t",
        kind: "recipe.completed",
        timestamp: new Date(now.getTime() - 60 * 60 * 1000),
        metadata: { artifact: "value-proof" },
      },
      { id: "3", tenantId: "t", kind: "error.raised", timestamp: now, metadata: {} },
      { id: "4", tenantId: "t", kind: "config.changed", timestamp: now, metadata: {} },
    ];

    const insight = summarizeTimeline(events, now);
    expect(insight.deployments).toBe(1);
    expect(insight.incidents).toBe(1);
    expect(insight.configChanges).toBe(1);
    expect(insight.recipesCompleted).toBe(1);
    expect(insight.stalledOnboardingHours).toBe(1);
    expect(insight.lastValueProof).toBe("value-proof");
  });
});
