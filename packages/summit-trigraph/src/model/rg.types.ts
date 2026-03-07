import type { ClaimRecord } from "../../../summit-ledger/src/types/writeset.types";

export interface RealityGraphState {
  claims: Record<string, ClaimRecord>;
}
