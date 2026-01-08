export interface CostEstimate {
  cpuCost: number;
  ioCost: number;
  networkCost: number;
  totalCost: number;
  confidence: number; // 0-1
  policyPenalty?: number;
}

export interface PlanNode {
  operator: string;
  arguments?: Record<string, any>;
  identifiers?: string[];
  children?: PlanNode[];
  estimatedRows: number;
  estimatedCost: number;
  safetyNotes?: string[];
}

export interface OptimizationHint {
  type: "FORCE_INDEX" | "IGNORE_INDEX" | "AVOID_CROSS_TENANT" | "USE_IMS";
  target?: string;
  parameters?: any;
}

export interface SubgraphViewDefinition {
  name: string;
  cypherQuery: string;
  refreshStrategy: "incremental" | "full" | "hybrid";
  dependencies: string[]; // Entity types or edge types
  policyTags: string[];
}

export interface ProvenanceManifest {
  viewName: string;
  refreshTimestamp: string;
  inputHashes: Record<string, string>; // Input data version hashes
  queryHash: string;
  signature: string;
  actor: string;
  policyCompliance: {
    checked: boolean;
    violations: string[];
  };
}

export interface OptimizerResult {
  plan: PlanNode;
  cost: CostEstimate;
  alternativesDropped: number;
  appliedHints: OptimizationHint[];
}
