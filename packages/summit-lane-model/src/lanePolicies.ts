import { SummitLane } from "./lanes";

export function isActionable(lane: SummitLane): boolean {
  return lane === "trusted" || lane === "promoted";
}

export function isVisibleToUsers(lane: SummitLane): boolean {
  return lane !== "quarantined" && lane !== "revoked";
}
