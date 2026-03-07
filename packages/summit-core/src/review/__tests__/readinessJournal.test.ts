import { describe, expect, it } from "vitest";
import { InMemoryJournalStore } from "../../admission/journalStore";
import { persistReadinessEvaluation } from "../readinessJournal";

describe("readinessJournal", () => {
  it("persists readiness evaluation into append journal", async () => {
    const journal = new InMemoryJournalStore();

    const event = await persistReadinessEvaluation({
      journal,
      branch_id: "alt-h1",
      scorecard: {
        scorecard_id: "score-1",
        branch_id: "alt-h1",
        created_at: "2026-03-07T01:00:00Z",
        status: "blocked",
        score: 2,
        max_score: 5,
        gates: [],
        blocked_reasons: ["Provenance coverage below threshold"],
        warnings: [],
      },
      now: "2026-03-07T01:00:00Z",
    });

    expect(event.sequence).toBe(1);
    expect(event.event_type).toBe("readiness_evaluated");
    expect(event.readiness_scorecard?.branch_id).toBe("alt-h1");
  });
});
