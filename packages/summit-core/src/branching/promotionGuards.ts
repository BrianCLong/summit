import type { BranchRecord } from "./branchLifecycle";
import type { ReviewerChecklistArtifact } from "../review/reviewerChecklist";
import type { WriteSet } from "../ledger/writeset";
import type {
  EvaluateBranchReadinessResult,
  ReadinessPolicy,
} from "../review/evaluateBranchReadiness";
import { evaluateBranchReadiness } from "../review/evaluateBranchReadiness";
import type {
  OverrideSigningConfig,
  SignedPromotionOverrideReceipt,
} from "./overrideReceipts";
import { verifyPromotionOverride } from "./overrideReceipts";

export interface PromotionGuardDecision {
  allowed: boolean;
  mode: "ready" | "override" | "blocked";
  readiness: EvaluateBranchReadinessResult;
  blocked_reasons: string[];
  override_used: boolean;
}

export interface EvaluatePromotionGuardsArgs {
  branch: BranchRecord;
  writesets: WriteSet[];
  checklist?: ReviewerChecklistArtifact;
  policy: ReadinessPolicy;
  now: string;
  override_receipt?: SignedPromotionOverrideReceipt;
  override_signing?: OverrideSigningConfig;
}

export function evaluatePromotionGuards(
  args: EvaluatePromotionGuardsArgs,
): PromotionGuardDecision {
  const readiness = evaluateBranchReadiness({
    branch: args.branch,
    writesets: args.writesets,
    checklist: args.checklist,
    policy: args.policy,
    now: args.now,
  });

  if (readiness.scorecard.status === "ready") {
    return {
      allowed: true,
      mode: "ready",
      readiness,
      blocked_reasons: [],
      override_used: false,
    };
  }

  const overrideValid =
    args.override_receipt &&
    args.override_signing &&
    args.override_receipt.branch_id === args.branch.branch_id &&
    verifyPromotionOverride(args.override_receipt, args.override_signing, args.now);

  if (overrideValid) {
    return {
      allowed: true,
      mode: "override",
      readiness,
      blocked_reasons: readiness.scorecard.blocked_reasons,
      override_used: true,
    };
  }

  return {
    allowed: false,
    mode: "blocked",
    readiness,
    blocked_reasons: readiness.scorecard.blocked_reasons,
    override_used: false,
  };
}
