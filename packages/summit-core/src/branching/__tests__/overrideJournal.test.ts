import { describe, expect, it } from "vitest";
import { InMemoryJournalStore } from "../../admission/journalStore";
import { signPromotionOverride, persistOverrideEvent } from "../overrideReceipts";

describe("overrideJournal", () => {
  it("persists signed override receipt into append journal", async () => {
    const journal = new InMemoryJournalStore();

    const receipt = signPromotionOverride(
      {
        override_id: "ovr-1",
        actor_id: "admin-1",
        action: "OVERRIDE_READINESS_BLOCK",
        branch_id: "alt-h1",
        rationale: "Emergency exception",
        created_at: "2026-03-07T01:00:00Z",
      },
      {
        secret: "override-secret",
        key_id: "override-dev",
      },
    );

    const event = await persistOverrideEvent({
      journal,
      receipt,
      now: "2026-03-07T01:01:00Z",
      related_sequences: [1],
    });

    expect(event.sequence).toBe(1);
    expect(event.event_type).toBe("override_recorded");
    expect(event.override_receipt?.override_id).toBe("ovr-1");
    expect(event.related_sequences).toEqual([1]);
  });
});
