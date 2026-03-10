import type { LaneQueryPolicy, PromotionLane } from "./types";

function laneRank(lane: PromotionLane): number {
  switch (lane) {
    case "CANDIDATE":
      return 1;
    case "OBSERVED":
      return 2;
    case "TRUSTED":
      return 3;
    case "PROMOTED":
      return 4;
  }
}

export function laneAllowed(lane: PromotionLane, policy: LaneQueryPolicy): boolean {
  switch (policy) {
    case "PROMOTED_ONLY":
      return lane === "PROMOTED";
    case "TRUSTED_AND_UP":
      return laneRank(lane) >= laneRank("TRUSTED");
    case "OBSERVED_AND_UP":
      return laneRank(lane) >= laneRank("OBSERVED");
    case "ALL_LANES":
      return true;
  }
}

export function laneWeight(lane: PromotionLane, policy: LaneQueryPolicy): number {
  if (!laneAllowed(lane, policy)) return 0;

  switch (lane) {
    case "PROMOTED":
      return 1.0;
    case "TRUSTED":
      return policy === "PROMOTED_ONLY" ? 0 : 0.9;
    case "OBSERVED":
      return policy === "ALL_LANES" || policy === "OBSERVED_AND_UP" ? 0.7 : 0;
    case "CANDIDATE":
      return policy === "ALL_LANES" ? 0.45 : 0;
  }
}
