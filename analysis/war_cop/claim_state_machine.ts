export type EpistemicState =
  | "new"
  | "supported"
  | "corroborated"
  | "contested"
  | "stale"
  | "retired";

export interface ClaimRecord {
  claim_id: string;
  state: EpistemicState;
  corroboration_count: number;
  contradiction_count: number;
  disinfo_risk: "low" | "medium" | "high";
  last_checked_utc: string;
}

export function updateClaimState(claim: ClaimRecord): ClaimRecord {
  let newState = claim.state;
  if (claim.contradiction_count > 0) {
    newState = "contested";
  } else if (claim.corroboration_count > 1) {
    newState = "corroborated";
  } else if (claim.corroboration_count === 1) {
    newState = "supported";
  }
  return { ...claim, state: newState };
}
