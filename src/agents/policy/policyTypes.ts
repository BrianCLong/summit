export type DataClassification =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED';

export interface ToolDefinition {
  id: string;
  description: string;
  capabilities: string[];
  scopes: string[];
  rateLimitPerMin: number;
  enabled: boolean;
  classification?: DataClassification;
}

export interface SourceDefinition {
  id: string;
  name: string;
  description: string;
  classification: DataClassification;
  jurisdiction: string[];
  lawful_basis: string;
  retention_days: number;
  collection_methods: string[];
  requires_approval?: boolean;
  enabled: boolean;
}

export interface ToolRegistry {
  version: number;
  tools: Record<string, ToolDefinition>;
}

export interface SourceRegistry {
  version: number;
  sources: Record<string, SourceDefinition>;
}

export interface BannedPatternRegistry {
  version: number;
  patterns: string[];
}

export interface PolicyBundle {
  tools: Record<string, ToolDefinition>;
  sources: Record<string, SourceDefinition>;
  bannedPatterns: string[];
}

export interface ToolInvocation {
  toolId: string;
  operation?: string;
  sourceId?: string;
  scopes?: string[];
  approvalId?: string;
}

export interface PolicyDecision {
  allow: boolean;
  reason?: string;
}
