export interface DecisionRequest {
  tenantId: string;
  toolId: string;
  units: number;
  geo?: string;
  policyTier?: string;
  anomalyScore?: number;
  priorityLane?: string;
  timestamp?: string;
}

export interface DecisionResponse {
  decision: {
    tenantId: string;
    toolId: string;
    allowed: boolean;
    reason: string;
    remaining: number;
    limit: number;
    windowStart: string;
    windowEnd: string;
  };
}

export interface SignedSnapshot {
  snapshot: SnapshotData;
  signature: string;
}

export interface SnapshotData {
  tenantId: string;
  generatedAt: string;
  windowSeconds: number;
  tools: ToolSnapshot[];
}

export interface ToolSnapshot {
  toolId: string;
  config: ToolConfig;
  lanes: LaneSnapshot[];
}

export interface LaneSnapshot {
  lane: string;
  windowStart: string;
  used: number;
}

export interface ToolConfig {
  baseLimit: number;
  burstCredits: number;
  priorityLanes?: Record<string, PriorityLaneConfig>;
  risk: RiskConfig;
}

export interface PriorityLaneConfig {
  multiplier?: number;
  burstBonus?: number;
}

export interface RiskConfig {
  defaultMultiplier?: number;
  anomalyBuckets?: AnomalyBucket[];
  geoMultipliers?: Record<string, number>;
  policyTierMultipliers?: Record<string, number>;
  highRiskPenaltyMultiplier?: number;
}

export interface AnomalyBucket {
  min: number;
  max: number;
  multiplier: number;
}

export interface RarlClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}
