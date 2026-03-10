import { describe, expect, it } from "vitest";
import { InMemoryLedgerStore } from "../../ledger/ledgerStore";
import { InMemoryJournalStore } from "../../admission/journalStore";
import { admitWriteSet } from "../../admission/admitWriteSet";
import { signAnalystReviewAction } from "../reviewActions";
import { signPromotionOverride } from "../overrideReceipts";
import { promoteBranchBundle } from "../promoteBranchBundle";
import type { BranchRecord } from "../branchLifecycle";
import type { WriteSet } from "../../ledger/materializeViews";

const signing = { secret: "admit-secret", key_id: "admit-dev" };
const mergeSigning = { secret: "merge-secret", key_id: "merge-dev" };
const overrideSigning = { secret: "override-secret", key_id: "override-dev" };

function ws(id: string, claims: WriteSet["claims"], record_time: string): WriteSet {
  return {
    writeset_id: id,
    record_time,
    writer: { actor_id: "agent-a", type: "agent", version: "1.0.0" },
    provenance: [],
    claims,
  };
}

describe("chain of custody e2e", () => {
  it("records readiness -> override -> promotion in append journal and merge report", async () => {
    const ledger = new InMemoryLedgerStore();
    const journal = new InMemoryJournalStore();

    await admitWriteSet(
      ledger,
      journal,
      ws(
        "ws-alt-1",
        [
          {
            claim_id: "claim-alt-1",
            subject: { kind: "entity", id: "entity-a" },
            predicate: "located_in",
            object: { kind: "entity", id: "loc-alt" },
            record_time: "2026-03-01T00:00:00Z",
            confidence: 0.8,
            uncertainty: 0.1,
            status: "supported",
            branch_id: "alt-h1",
            provenance_refs: [],
          },
          {
            claim_id: "claim-support-1",
            subject: { kind: "document", id: "doc-1" },
            predicate: "supports",
            object: { kind: "claim", id: "claim-alt-1" },
            record_time: "2026-03-01T00:01:00Z",
            confidence: 0.9,
            uncertainty: 0.05,
            status: "validated",
            branch_id: "alt-h1",
            supports: ["claim-alt-1"],
            provenance_refs: [],
          },
        ],
        "2026-03-01T00:00:00Z",
      ),
      {
        signing,
        materializeMode: "history",
        branchMode: "include-all",
      },
    );

    const branch: BranchRecord = {
      branch_id: "alt-h1",
      title: "Alt hypothesis",
      status: "approved",
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-07T00:00:00Z",
      created_by: "analyst-1",
      approved_at: "2026-03-07T00:00:00Z",
      open_contradictions: 0,
      claim_ids: ["claim-alt-1"],
      source_writeset_ids: ["ws-alt-1"],
    };

    const review = signAnalystReviewAction(
      {
        review_id: "review-1",
        actor_id: "analyst-1",
        action: "APPROVE_PROMOTION",
        target_branch_id: "alt-h1",
        target_claim_ids: ["claim-alt-1"],
        created_at: "2026-03-07T01:00:00Z",
      },
      signing,
    );

    const override = signPromotionOverride(
      {
        override_id: "ovr-1",
        actor_id: "admin-1",
        action: "OVERRIDE_READINESS_BLOCK",
        branch_id: "alt-h1",
        rationale: "Emergency exception",
        created_at: "2026-03-07T01:10:00Z",
      },
      overrideSigning,
    );

    const result = await promoteBranchBundle({
      branch,
      ledger,
      journal,
      policy: {
        min_support_count: 1,
        contradiction_confidence_cutoff: 0.8,
        max_open_contradictions_for_approval: 0,
      },
      readiness_policy: {
        minimum_provenance_coverage: 1,
        contradiction_budget: 0,
        max_unresolved_supersession_chains: 0,
        minimum_source_diversity: 1,
        require_complete_checklist: false,
      },
      review_receipt: review,
      override_receipt: override,
      signing,
      overrideSigning,
      mergeReportSigning: mergeSigning,
      actor_id: "analyst-1",
      now: "2026-03-07T02:00:00Z",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");

    expect(result.chain_of_custody?.readiness_sequence).toBeTruthy();
    expect(result.chain_of_custody?.override_sequence).toBeTruthy();
    expect(result.chain_of_custody?.promotion_sequence).toBeTruthy();

    expect(result.signed_merge_report?.chain_of_custody?.readiness_sequence).toBeTruthy();
    expect(result.signed_merge_report?.override_receipt?.override_id).toBe("ovr-1");
    expect(result.signed_merge_report?.promotion_receipt?.writeset_id).toContain("ws-branch-bundle-promote");

    const events = await journal.list();
    expect(events.some((e) => e.event_type === "readiness_evaluated")).toBe(true);
    expect(events.some((e) => e.event_type === "override_recorded")).toBe(true);
    expect(events.some((e) => e.event_type === "branch_promoted")).toBe(true);
  });
});
