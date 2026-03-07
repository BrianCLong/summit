import { createHmac } from "node:crypto";
import type { SignedPromotionOverrideReceipt } from "./overrideReceipts";
import type { BranchReadinessScorecard } from "../review/readinessReport";
import type { AdmissionReceipt } from "../admission/admissionReceipt";

export interface BranchMergeDecision {
  claim_id: string;
  decision: "promoted" | "skipped" | "reverted";
  reasons: string[];
}

export interface ChainOfCustodyRefs {
  readiness_sequence?: number;
  override_sequence?: number;
  promotion_sequence?: number;
}

export interface BranchMergeReport {
  report_id: string;
  branch_id: string;
  target_branch_id: string;
  branch_status_before: string;
  branch_status_after: string;
  created_at: string;
  actor_id: string;
  promoted_claim_ids: string[];
  skipped_claim_ids: string[];
  reverted_claim_ids: string[];
  open_contradictions_before: number;
  open_contradictions_after: number;
  bundle_writeset_id?: string;
  source_writeset_ids: string[];
  decisions: BranchMergeDecision[];

  readiness_scorecard?: BranchReadinessScorecard;
  override_receipt?: SignedPromotionOverrideReceipt;
  promotion_receipt?: AdmissionReceipt;
  chain_of_custody?: ChainOfCustodyRefs;
}

export interface SignedBranchMergeReport extends BranchMergeReport {
  payload_hash: string;
  signature: string;
  key_id: string;
}

export interface MergeReportSigningConfig {
  secret: string;
  key_id: string;
}

function payloadHash(report: BranchMergeReport): string {
  const canonical = JSON.stringify({
    report_id: report.report_id,
    branch_id: report.branch_id,
    target_branch_id: report.target_branch_id,
    branch_status_before: report.branch_status_before,
    branch_status_after: report.branch_status_after,
    created_at: report.created_at,
    actor_id: report.actor_id,
    promoted_claim_ids: [...report.promoted_claim_ids].sort(),
    skipped_claim_ids: [...report.skipped_claim_ids].sort(),
    reverted_claim_ids: [...report.reverted_claim_ids].sort(),
    open_contradictions_before: report.open_contradictions_before,
    open_contradictions_after: report.open_contradictions_after,
    bundle_writeset_id: report.bundle_writeset_id ?? "",
    source_writeset_ids: [...report.source_writeset_ids].sort(),
    chain_of_custody: report.chain_of_custody ?? {},
    decisions: [...report.decisions].sort((a, b) => a.claim_id.localeCompare(b.claim_id)),
  });

  return createHmac("sha256", "branch-merge-payload").update(canonical, "utf8").digest("hex");
}

export function signBranchMergeReport(
  report: BranchMergeReport,
  signing: MergeReportSigningConfig,
): SignedBranchMergeReport {
  const ph = payloadHash(report);
  const signature = createHmac("sha256", signing.secret)
    .update(JSON.stringify({ key_id: signing.key_id, payload_hash: ph }), "utf8")
    .digest("hex");

  return {
    ...report,
    payload_hash: ph,
    signature,
    key_id: signing.key_id,
  };
}

export function verifyBranchMergeReport(
  report: SignedBranchMergeReport,
  signing: MergeReportSigningConfig,
): boolean {
  const unsigned: BranchMergeReport = {
    report_id: report.report_id,
    branch_id: report.branch_id,
    target_branch_id: report.target_branch_id,
    branch_status_before: report.branch_status_before,
    branch_status_after: report.branch_status_after,
    created_at: report.created_at,
    actor_id: report.actor_id,
    promoted_claim_ids: report.promoted_claim_ids,
    skipped_claim_ids: report.skipped_claim_ids,
    reverted_claim_ids: report.reverted_claim_ids,
    open_contradictions_before: report.open_contradictions_before,
    open_contradictions_after: report.open_contradictions_after,
    bundle_writeset_id: report.bundle_writeset_id,
    source_writeset_ids: report.source_writeset_ids,
    decisions: report.decisions,
    readiness_scorecard: report.readiness_scorecard,
    override_receipt: report.override_receipt,
    promotion_receipt: report.promotion_receipt,
    chain_of_custody: report.chain_of_custody,
  };

  const expected = signBranchMergeReport(unsigned, signing);
  return expected.payload_hash === report.payload_hash && expected.signature === report.signature;
}
