import { createHmac } from "node:crypto";
import type { JournalStore, JournalEvent } from "../admission/journalStore";

export type OverrideAction = "OVERRIDE_READINESS_BLOCK";

export interface PromotionOverrideRequest {
  override_id: string;
  actor_id: string;
  action: OverrideAction;
  branch_id: string;
  rationale: string;
  created_at: string;
  expires_at?: string;
}

export interface SignedPromotionOverrideReceipt extends PromotionOverrideRequest {
  payload_hash: string;
  signature: string;
  key_id: string;
}

export interface OverrideSigningConfig {
  secret: string;
  key_id: string;
}

function canonicalPayload(req: PromotionOverrideRequest): string {
  return JSON.stringify({
    override_id: req.override_id,
    actor_id: req.actor_id,
    action: req.action,
    branch_id: req.branch_id,
    rationale: req.rationale,
    created_at: req.created_at,
    expires_at: req.expires_at ?? "",
  });
}

function payloadHash(req: PromotionOverrideRequest): string {
  return createHmac("sha256", "override-payload")
    .update(canonicalPayload(req), "utf8")
    .digest("hex");
}

export function signPromotionOverride(
  req: PromotionOverrideRequest,
  signing: OverrideSigningConfig,
): SignedPromotionOverrideReceipt {
  const ph = payloadHash(req);
  const signature = createHmac("sha256", signing.secret)
    .update(JSON.stringify({ key_id: signing.key_id, payload_hash: ph }), "utf8")
    .digest("hex");

  return {
    ...req,
    payload_hash: ph,
    signature,
    key_id: signing.key_id,
  };
}

export function verifyPromotionOverride(
  receipt: SignedPromotionOverrideReceipt,
  signing: OverrideSigningConfig,
  now?: string,
): boolean {
  const unsigned: PromotionOverrideRequest = {
    override_id: receipt.override_id,
    actor_id: receipt.actor_id,
    action: receipt.action,
    branch_id: receipt.branch_id,
    rationale: receipt.rationale,
    created_at: receipt.created_at,
    expires_at: receipt.expires_at,
  };

  const expectedHash = payloadHash(unsigned);
  if (expectedHash !== receipt.payload_hash) return false;

  const expectedSig = createHmac("sha256", signing.secret)
    .update(JSON.stringify({ key_id: signing.key_id, payload_hash: expectedHash }), "utf8")
    .digest("hex");

  if (expectedSig !== receipt.signature) return false;
  if (receipt.expires_at && now && receipt.expires_at < now) return false;

  return true;
}

export async function persistOverrideEvent(args: {
  journal: JournalStore;
  receipt: SignedPromotionOverrideReceipt;
  now: string;
  related_sequences?: number[];
}): Promise<JournalEvent> {
  return args.journal.append({
    event_type: "override_recorded",
    branch_id: args.receipt.branch_id,
    admitted_at: args.now,
    override_receipt: args.receipt,
    related_sequences: args.related_sequences ?? [],
    details: {
      override_id: args.receipt.override_id,
      actor_id: args.receipt.actor_id,
      action: args.receipt.action,
    },
  });
}
