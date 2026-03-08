import { SummitLane } from "./lanes";

export const ALLOWED_TRANSITIONS: Record<SummitLane, SummitLane[]> = {
  candidate: ["observed", "quarantined"],
  observed: ["reviewed", "quarantined"],
  reviewed: ["trusted", "quarantined", "revoked"],
  trusted: ["promoted", "quarantined", "revoked"],
  promoted: ["revoked", "quarantined"],
  quarantined: ["revoked", "reviewed"], // e.g. review quarantine
  revoked: []
};

export function isValidTransition(from: SummitLane, to: SummitLane): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
