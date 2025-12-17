export interface NodeSchema {
  label: string;
  properties: string[];
}

export interface RelationshipSchema {
  type: string;
  from: string;
  to: string;
}

export interface GraphSchema {
  nodes: NodeSchema[];
  relationships: RelationshipSchema[];
}

export interface TranslationResult {
  cypher: string;
  sqlFallback?: string;
  confidence: number;
  warnings: string[];
  reasoningTrace: string[];
}

export interface EstimateResult {
  estimatedRows: number;
  estimatedCost: number;
}

export interface SandboxResult {
  previewRows: Record<string, unknown>[];
  truncated: boolean;
}

export interface BlockCheck {
  blocked: boolean;
  reasons: string[];
}
