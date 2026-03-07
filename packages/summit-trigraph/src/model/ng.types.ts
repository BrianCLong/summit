import type { ClaimRecord } from "../../../summit-ledger/src/types/writeset.types";

export interface NarrativeGraphState {
  claims: Record<string, ClaimRecord>;
}
