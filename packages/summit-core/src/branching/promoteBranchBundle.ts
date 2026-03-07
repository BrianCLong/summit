import type { LedgerStore } from "../ledger/ledgerStore";
import type { JournalStore } from "../admission/journalStore";
import { admitWriteSet } from "../admission/admitWriteSet";
import type { ReceiptSigningConfig } from "../admission/admissionReceipt";
import type { WriteSet, Claim } from "../ledger/writeset";
import type { SignedAnalystReviewReceipt } from "./reviewActions";
import { verifyAnalystReviewReceipt } from "./reviewActions";
import {
  BranchRecord,
  computeOpenContradictions,
  transitionBranch,
} from "./branchLifecycle";
import {
  BranchMergeReport,
  signBranchMergeReport,
  type MergeReportSigningConfig,
} from "./branchMergeReport";
import type { ReviewerChecklistArtifact } from "../review/reviewerChecklist";
import type { ReadinessPolicy } from "../review/evaluateBranchReadiness";
import type {
  OverrideSigningConfig,
  SignedPromotionOverrideReceipt,
} from "./overrideReceipts";
import { evaluatePromotionGuards } from "./promotionGuards";
import { persistReadinessEvaluation } from "../review/readinessJournal";
import { persistOverrideEvent } from "./overrideReceipts";

export interface PromotionBundlePolicy {
  min_support_count: number;
  contradiction_confidence_cutoff: number;
  max_open_contradictions_for_approval: number;
}

export interface PromotionBundleResult {
  ok: boolean;
  updated_branch?: BranchRecord;
  promotion_writeset?: WriteSet;
  promoted_claim_ids: string[];
  skipped_claim_ids: string[];
  signed_merge_report?: ReturnType<typeof signBranchMergeReport>;
  admission_result?: Awaited<ReturnType<typeof admitWriteSet>>;
  readiness_status?: "ready" | "needs_review" | "blocked";
  override_used?: boolean;
  blocked_reasons?: string[];
  chain_of_custody?: {
    readiness_sequence?: number;
    override_sequence?: number;
    promotion_sequence?: number;
  };
}

function countSupport(claim: Claim, allClaims: Claim[]): number {
  return allClaims.filter((c) => (c.supports ?? []).includes(claim.claim_id)).length;
}

function blockingContradictions(claim: Claim, allClaims: Claim[], cutoff: number): Claim[] {
  return allClaims.filter(
    (c) =>
      c.status !== "rejected" &&
      c.confidence >= cutoff &&
      (c.contradicts ?? []).includes(claim.claim_id),
  );
}

function promoteClaim(claim: Claim, now: string): Claim {
  return {
    ...claim,
    claim_id: `${claim.claim_id}::bundle-promoted`,
    branch_id: "main",
    record_time: now,
  };
}

export async function promoteBranchBundle(args: {
  branch: BranchRecord;
  ledger: LedgerStore;
  journal: JournalStore;
  policy: PromotionBundlePolicy;
  readiness_policy: ReadinessPolicy;
  checklist?: ReviewerChecklistArtifact;
  review_receipt: SignedAnalystReviewReceipt;
  override_receipt?: SignedPromotionOverrideReceipt;
  signing: ReceiptSigningConfig;
  overrideSigning?: OverrideSigningConfig;
  mergeReportSigning: MergeReportSigningConfig;
  actor_id: string;
  now?: string;
}): Promise<PromotionBundleResult> {
  const now = args.now ?? new Date().toISOString();

  if (!verifyAnalystReviewReceipt(args.review_receipt, args.signing)) {
    return { ok: false, promoted_claim_ids: [], skipped_claim_ids: [] };
  }

  if (args.review_receipt.action !== "APPROVE_PROMOTION") {
    return { ok: false, promoted_claim_ids: [], skipped_claim_ids: [] };
  }

  if (args.branch.status !== "approved") {
    return { ok: false, promoted_claim_ids: [], skipped_claim_ids: [] };
  }

  const writesets = await args.ledger.listWriteSets();

  const guard = evaluatePromotionGuards({
    branch: args.branch,
    writesets,
    checklist: args.checklist,
    policy: args.readiness_policy,
    now,
    override_receipt: args.override_receipt,
    override_signing: args.overrideSigning,
  });

  const readinessEvent = await persistReadinessEvaluation({
    journal: args.journal,
    branch_id: args.branch.branch_id,
    scorecard: guard.readiness.scorecard,
    merge_blocked_report: guard.readiness.merge_blocked_report,
    now,
  });

  let overrideSequence: number | undefined;
  if (guard.override_used && args.override_receipt) {
    const overrideEvent = await persistOverrideEvent({
      journal: args.journal,
      receipt: args.override_receipt,
      now,
      related_sequences: [readinessEvent.sequence],
    });
    overrideSequence = overrideEvent.sequence;
  }

  if (!guard.allowed) {
    await args.journal.append({
      event_type: "branch_promotion_blocked",
      branch_id: args.branch.branch_id,
      admitted_at: now,
      related_sequences: [readinessEvent.sequence].filter(Boolean),
      details: {
        blocked_reasons: guard.blocked_reasons,
        review_id: args.review_receipt.review_id,
      },
    });

    return {
      ok: false,
      promoted_claim_ids: [],
      skipped_claim_ids: [],
      readiness_status: guard.readiness.scorecard.status,
      override_used: false,
      blocked_reasons: guard.blocked_reasons,
      chain_of_custody: {
        readiness_sequence: readinessEvent.sequence,
      },
    };
  }

  const allClaims = writesets.flatMap((w) => w.claims);
  const openContradictions = computeOpenContradictions(args.branch.claim_ids, allClaims);
  if (openContradictions > args.policy.max_open_contradictions_for_approval) {
    await args.journal.append({
      event_type: "branch_promotion_blocked",
      branch_id: args.branch.branch_id,
      admitted_at: now,
      related_sequences: [readinessEvent.sequence, overrideSequence].filter(
        (x): x is number => typeof x === "number",
      ),
      details: {
        blocked_reasons: [`Open contradictions exceeded bundle gate: ${openContradictions}`],
        review_id: args.review_receipt.review_id,
      },
    });

    return {
      ok: false,
      promoted_claim_ids: [],
      skipped_claim_ids: [],
      readiness_status: guard.readiness.scorecard.status,
      override_used: guard.override_used,
      blocked_reasons: [`Open contradictions exceeded bundle gate: ${openContradictions}`],
      chain_of_custody: {
        readiness_sequence: readinessEvent.sequence,
        override_sequence: overrideSequence,
      },
    };
  }

  const branchClaims = allClaims.filter((c) => args.branch.claim_ids.includes(c.claim_id));

  const promoted: Claim[] = [];
  const skipped: string[] = [];
  const decisions: BranchMergeReport["decisions"] = [];

  for (const claim of branchClaims) {
    const supports = countSupport(claim, allClaims);
    const contradictions = blockingContradictions(
      claim,
      allClaims,
      args.policy.contradiction_confidence_cutoff,
    );

    const reasons: string[] = [];
    if (supports < args.policy.min_support_count) {
      reasons.push(`INSUFFICIENT_SUPPORT:${supports}<${args.policy.min_support_count}`);
    }
    if (contradictions.length > 0) {
      reasons.push(
        `UNRESOLVED_CONTRADICTIONS:${contradictions.map((c) => c.claim_id).join(",")}`,
      );
    }

    if (reasons.length) {
      skipped.push(claim.claim_id);
      decisions.push({
        claim_id: claim.claim_id,
        decision: "skipped",
        reasons,
      });
      continue;
    }

    const promotedClaim = promoteClaim(claim, now);
    promoted.push(promotedClaim);
    decisions.push({
      claim_id: claim.claim_id,
      decision: "promoted",
      reasons: guard.override_used ? ["PROMOTED_WITH_SIGNED_OVERRIDE"] : [],
    });
  }

  if (promoted.length === 0) {
    return {
      ok: false,
      promoted_claim_ids: [],
      skipped_claim_ids: skipped,
      readiness_status: guard.readiness.scorecard.status,
      override_used: guard.override_used,
      blocked_reasons: [],
      chain_of_custody: {
        readiness_sequence: readinessEvent.sequence,
        override_sequence: overrideSequence,
      },
    };
  }

  const promotionWriteSet: WriteSet = {
    writeset_id: `ws-branch-bundle-promote-${args.branch.branch_id}-${now}`,
    record_time: now,
    writer: {
      actor_id: args.actor_id,
      type: "human",
      version: "bundle-promotion/v3",
    },
    provenance: [],
    claims: promoted,
    validations: [
      {
        validator: "branch_bundle_promotion_policy",
        status: "pass",
        message: `Promoted ${promoted.length} claims from ${args.branch.branch_id}`,
      },
    ],
    metadata: {
      branch_bundle_promotion: {
        source_branch_id: args.branch.branch_id,
        approved_by_review_id: args.review_receipt.review_id,
        readiness_status: guard.readiness.scorecard.status,
        override_used: guard.override_used,
        override_id: args.override_receipt?.override_id,
        readiness_sequence: readinessEvent.sequence,
        override_sequence: overrideSequence,
      },
    },
  };

  const admission_result = await admitWriteSet(
    args.ledger,
    args.journal as any,
    promotionWriteSet,
    {
      signing: args.signing,
      materializeMode: "current",
      branchMode: "main-only",
      admissionVersion: "bundle-promotion/v3",
    },
  );

  if (!admission_result.ok) {
    return {
      ok: false,
      promoted_claim_ids: [],
      skipped_claim_ids: skipped,
      admission_result,
      readiness_status: guard.readiness.scorecard.status,
      override_used: guard.override_used,
      blocked_reasons: [],
      chain_of_custody: {
        readiness_sequence: readinessEvent.sequence,
        override_sequence: overrideSequence,
      },
    };
  }

  const promotionEvent = await args.journal.append({
    event_type: "branch_promoted",
    branch_id: args.branch.branch_id,
    writeset_id: promotionWriteSet.writeset_id,
    batch_signature: promotionWriteSet.batch_signature,
    admitted_at: now,
    receipt: admission_result.receipt,
    related_sequences: [readinessEvent.sequence, overrideSequence].filter(
      (x): x is number => typeof x === "number",
    ),
    details: {
      promoted_claim_count: promoted.length,
      review_id: args.review_receipt.review_id,
    },
  });

  const updatedBranch = transitionBranch(args.branch, "promoted", args.actor_id, now);

  const report: BranchMergeReport = {
    report_id: `merge-${args.branch.branch_id}-${now}`,
    branch_id: args.branch.branch_id,
    target_branch_id: "main",
    branch_status_before: args.branch.status,
    branch_status_after: updatedBranch.status,
    created_at: now,
    actor_id: args.actor_id,
    promoted_claim_ids: promoted.map((c) => c.claim_id),
    skipped_claim_ids: skipped,
    reverted_claim_ids: [],
    open_contradictions_before: openContradictions,
    open_contradictions_after: 0,
    bundle_writeset_id: promotionWriteSet.writeset_id,
    source_writeset_ids: args.branch.source_writeset_ids,
    decisions,
    readiness_scorecard: guard.readiness.scorecard,
    override_receipt: args.override_receipt,
    promotion_receipt: admission_result.receipt,
    chain_of_custody: {
      readiness_sequence: readinessEvent.sequence,
      override_sequence: overrideSequence,
      promotion_sequence: promotionEvent.sequence,
    },
  };

  const signed_merge_report = signBranchMergeReport(report, args.mergeReportSigning);

  return {
    ok: true,
    updated_branch: updatedBranch,
    promotion_writeset: promotionWriteSet,
    promoted_claim_ids: promoted.map((c) => c.claim_id),
    skipped_claim_ids: skipped,
    signed_merge_report,
    admission_result,
    readiness_status: guard.readiness.scorecard.status,
    override_used: guard.override_used,
    blocked_reasons: [],
    chain_of_custody: {
      readiness_sequence: readinessEvent.sequence,
      override_sequence: overrideSequence,
      promotion_sequence: promotionEvent.sequence,
    },
  };
}
