import type { WriteSet } from "../../../summit-ledger/src/types/writeset.types";
import { isUpsertClaimOp } from "../../../summit-ledger/src/types/writeset.types";
import type { RealityGraphState } from "../model/rg.types";
import type { PromotionAuditEntry } from "../model/promotion.types";

export function materializeRG(
  writesets: WriteSet[],
  allowedPromotionClaimIds: Set<string>
): { state: RealityGraphState; audit: PromotionAuditEntry[] } {
  const claims: RealityGraphState["claims"] = {};

  for (const writeset of writesets) {
    for (const op of writeset.ops) {
      if (isUpsertClaimOp(op) && op.graph === "RG") {
        claims[op.claim.claim_id] = op.claim;
      }
      if (isUpsertClaimOp(op) && (op.graph === "BG" || op.graph === "NG")) {
        if (allowedPromotionClaimIds.has(op.claim.claim_id)) {
          claims[op.claim.claim_id] = op.claim;
        }
      }
    }
  }

  return { state: { claims }, audit: [] };
}
