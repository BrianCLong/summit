import type { WriteSet } from "../../../summit-ledger/src/types/writeset.types";
import { isUpsertClaimOp } from "../../../summit-ledger/src/types/writeset.types";
import type { BeliefGraphState } from "../model/bg.types";

export function materializeBG(writesets: WriteSet[]): BeliefGraphState {
  const claims: BeliefGraphState["claims"] = {};

  for (const writeset of writesets) {
    for (const op of writeset.ops) {
      if (isUpsertClaimOp(op) && op.graph === "BG") {
        claims[op.claim.claim_id] = op.claim;
      }
    }
  }

  return { claims };
}
