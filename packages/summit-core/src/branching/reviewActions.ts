import { createHmac } from "node:crypto";

export type AnalystReviewActionType =
  | "APPROVE_PROMOTION"
  | "REJECT_PROMOTION"
  | "REQUEST_FOLLOWUP";

export interface AnalystReviewAction {
  review_id: string;
  actor_id: string;
  action: AnalystReviewActionType;
  target_branch_id: string;
  target_claim_ids: string[];
  rationale?: string;
  created_at: string;
}

export interface SignedAnalystReviewReceipt {
  receipt_id: string;
  review_id: string;
  actor_id: string;
  action: AnalystReviewActionType;
  target_branch_id: string;
  target_claim_ids: string[];
  rationale?: string;
  created_at: string;
  payload_hash: string;
  signature: string;
  key_id: string;
}

export interface ReviewSigningConfig {
  secret: string;
  key_id: string;
}

function sha256Like(input: string, secret = "review-payload"): string {
  return createHmac("sha256", secret).update(input, "utf8").digest("hex");
}

export function signAnalystReviewAction(
  review: AnalystReviewAction,
  signing: ReviewSigningConfig,
): SignedAnalystReviewReceipt {
  const canonical = JSON.stringify({
    review_id: review.review_id,
    actor_id: review.actor_id,
    action: review.action,
    target_branch_id: review.target_branch_id,
    target_claim_ids: [...review.target_claim_ids].sort(),
    rationale: review.rationale ?? "",
    created_at: review.created_at,
  });

  const payload_hash = sha256Like(canonical);
  const signature = createHmac("sha256", signing.secret)
    .update(
      JSON.stringify({
        key_id: signing.key_id,
        payload_hash,
      }),
      "utf8",
    )
    .digest("hex");

  return {
    receipt_id: `review-${review.review_id}`,
    review_id: review.review_id,
    actor_id: review.actor_id,
    action: review.action,
    target_branch_id: review.target_branch_id,
    target_claim_ids: [...review.target_claim_ids].sort(),
    rationale: review.rationale,
    created_at: review.created_at,
    payload_hash,
    signature,
    key_id: signing.key_id,
  };
}

export function verifyAnalystReviewReceipt(
  receipt: SignedAnalystReviewReceipt,
  signing: ReviewSigningConfig,
): boolean {
  const canonical = JSON.stringify({
    review_id: receipt.review_id,
    actor_id: receipt.actor_id,
    action: receipt.action,
    target_branch_id: receipt.target_branch_id,
    target_claim_ids: [...receipt.target_claim_ids].sort(),
    rationale: receipt.rationale ?? "",
    created_at: receipt.created_at,
  });

  const payload_hash = sha256Like(canonical);
  if (payload_hash !== receipt.payload_hash) return false;

  const expected = createHmac("sha256", signing.secret)
    .update(
      JSON.stringify({
        key_id: signing.key_id,
        payload_hash,
      }),
      "utf8",
    )
    .digest("hex");

  return expected === receipt.signature;
}
