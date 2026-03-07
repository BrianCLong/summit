export type SummitLane =
  | "candidate"
  | "observed"
  | "reviewed"
  | "trusted"
  | "promoted"
  | "quarantined"
  | "revoked";

export const SUMMIT_LANES: SummitLane[] = [
  "candidate",
  "observed",
  "reviewed",
  "trusted",
  "promoted",
  "quarantined",
  "revoked"
];
