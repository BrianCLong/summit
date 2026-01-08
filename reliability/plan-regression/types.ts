export interface CriticalQuery {
  id: string;
  description: string;
  sql: string;
  tags?: string[];
}

export interface PlanSignatureNode {
  nodeType: string;
  relationName?: string;
  indexName?: string;
  joinType?: string;
  estimatedRows?: number;
  filter?: string;
  children?: PlanSignatureNode[];
}

export interface PlanBaselineEntry {
  id: string;
  sql: string;
  description?: string;
  sqlHash?: string;
  signature: PlanSignatureNode;
}

export interface PlanBaseline {
  generatedAt: string;
  analyze: boolean;
  queries: PlanBaselineEntry[];
}

export interface PlanDiff {
  path: string;
  field: keyof PlanSignatureNode | "children" | "sqlHash" | "baseline";
  baseline?: string | number | undefined;
  current?: string | number | undefined;
  message: string;
}

export interface PlanCheckResult {
  queryId: string;
  differences: PlanDiff[];
  signature?: PlanSignatureNode;
}
