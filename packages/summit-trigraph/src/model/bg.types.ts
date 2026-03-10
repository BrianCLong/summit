import type { ClaimRecord } from "../../../summit-ledger/src/types/writeset.types";

export interface BeliefGraphState {
  claims: Record<string, ClaimRecord>;
}
