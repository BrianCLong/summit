import type { WriteSet } from "../../../summit-ledger/src/types/writeset.types";
import { isUpsertClaimOp } from "../../../summit-ledger/src/types/writeset.types";
import type { NarrativeGraphState } from "../model/ng.types";

export function materializeNG(writesets: WriteSet[]): NarrativeGraphState {
  const claims: NarrativeGraphState["claims"] = {};

  for (const writeset of writesets) {
    for (const op of writeset.ops) {
      if (isUpsertClaimOp(op) && op.graph === "NG") {
        claims[op.claim.claim_id] = op.claim;
      }
    }
  }

  return { claims };
}
