import type { LaneQueryPolicy, RetrievalRequest } from "./types";

export const RetrievalPresets = {
  analystStrict(query: string): RetrievalRequest {
    return {
      query,
      lanePolicy: "PROMOTED_ONLY",
      retrievalMode: "HYBRID",
      limit: 20,
      includeProvenance: true
    };
  },

  analystOperational(query: string): RetrievalRequest {
    return {
      query,
      lanePolicy: "TRUSTED_AND_UP",
      retrievalMode: "HYBRID",
      limit: 25,
      includeProvenance: true
    };
  },

  watchfloor(query: string): RetrievalRequest {
    return {
      query,
      lanePolicy: "OBSERVED_AND_UP",
      retrievalMode: "HYBRID",
      limit: 30,
      includeProvenance: true
    };
  },

  researchAll(query: string): RetrievalRequest {
    return {
      query,
      lanePolicy: "ALL_LANES",
      retrievalMode: "HYBRID",
      limit: 40,
      includeProvenance: true
    };
  }
} as const;

export function defaultPolicyForAgent(agentClass: string): LaneQueryPolicy {
  switch (agentClass) {
    case "executive-briefing":
      return "PROMOTED_ONLY";
    case "investigator":
      return "TRUSTED_AND_UP";
    case "monitoring":
      return "OBSERVED_AND_UP";
    case "research":
      return "ALL_LANES";
    default:
      return "TRUSTED_AND_UP";
  }
}
