import type { LedgerDbHandle } from "../../../summit-ledger/src/db/initLedgerDb";
import { loadWriteSetsAsKnownAt } from "../../../summit-ledger/src/query/replay";
import { isUpsertClaimOp, type ClaimRecord, type WriteSet } from "../../../summit-ledger/src/types/writeset.types";
import type { PromotionPolicyConfig } from "../rules/promotionPolicy";
import { evaluatePromotion } from "../rules/promotionPolicy";
import { materializeBG } from "./materializeBG";
import { materializeNG } from "./materializeNG";
import { materializeRG } from "./materializeRG";
import type { PromotionAuditEntry } from "../model/promotion.types";

export interface MaterializeAllInput {
  db: LedgerDbHandle;
  asKnownAt: string;
  policy: PromotionPolicyConfig;
}

export interface MaterializeAllResult {
  rg: ReturnType<typeof materializeRG>["state"];
  bg: ReturnType<typeof materializeBG>;
  ng: ReturnType<typeof materializeNG>;
  audit: PromotionAuditEntry[];
}

function buildClaimIndex(writesets: WriteSet[]): Map<string, ClaimRecord> {
  const index = new Map<string, ClaimRecord>();
  for (const writeset of writesets) {
    for (const op of writeset.ops) {
      if (isUpsertClaimOp(op)) {
        index.set(op.claim.claim_id, op.claim);
      }
    }
  }
  return index;
}

export async function materializeAll(
  input: MaterializeAllInput
): Promise<MaterializeAllResult> {
  const writesets = await loadWriteSetsAsKnownAt(input.db, input.asKnownAt);
  const bg = materializeBG(writesets);
  const ng = materializeNG(writesets);
  const claimIndex = buildClaimIndex(writesets);

  const audit: PromotionAuditEntry[] = [];
  const allowedPromotionClaimIds = new Set<string>();

  for (const writeset of writesets) {
    for (const op of writeset.ops) {
      if (op.op === "PROPOSE_PROMOTION") {
        const claim = claimIndex.get(op.promotion.claim_id);
        const result = evaluatePromotion(
          { writeset, proposal: op.promotion, claim },
          input.policy
        );
        audit.push(result);
        if (result.decision === "ALLOW") {
          allowedPromotionClaimIds.add(op.promotion.claim_id);
        }
      }
    }
  }

  const rgResult = materializeRG(writesets, allowedPromotionClaimIds);

  return {
    rg: rgResult.state,
    bg,
    ng,
    audit,
  };
}
