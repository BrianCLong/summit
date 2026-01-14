export type GovernanceMode = 'pr' | 'release' | 'ci';
export type TaskType = 'plan' | 'implement' | 'review';
export type RepoFocus = 'frontend' | 'backend' | 'security' | 'docs' | 'mixed';

export interface SkillpackFrontmatter {
  name: string;
  description: string;
  triggers: string[];
  shards?: Record<string, string[]>;
}

export interface SkillpackDefinition {
  name: string;
  description: string;
  triggers: string[];
  shardHints: Record<string, string[]>;
  directory: string;
  skillMarkdownPath: string;
  mcpConfigPath?: string;
  policyPath?: string;
}

export interface McpServerConfig {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  includeTools?: string[];
  toolGlobs?: string[];
  shards?: Record<string, ToolShardConfig>;
}

export interface ToolShardConfig {
  includeTools?: string[];
  toolGlobs?: string[];
}

export interface McpConfig {
  servers: McpServerConfig[];
}

export interface TaskContext {
  taskType: TaskType;
  governanceMode: GovernanceMode;
  repoFocus: RepoFocus;
  contextBudget: number;
  remainingBudget: number;
}

export interface ToolSchema {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
  metadata?: {
    safety?: string;
    permissions?: string[];
  };
}

export interface JsonSchema {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: string[];
}

export interface DistilledToolSchema {
  name: string;
  purpose: string;
  paramsSummary: string;
  safetyNote: string;
  permissions: string[];
  source: 'distilled';
}

export interface FullToolSchemaRecord {
  tool: ToolSchema;
  source: 'full';
}

export interface ToolInjectionResult {
  toolName: string;
  mode: 'distilled' | 'full' | 'denied';
  tokenEstimate: number;
  policyReason: string;
}

export interface ToolLoadingReport {
  generatedAt: string;
  skillpack: string;
  shard: string;
  planStepId: string;
  planStepSummary: string;
  expectedUtility: string;
  alternativesConsidered: string[];
  taskContext: TaskContext;
  shardReasoning: string[];
  tools: ToolInjectionResult[];
  totals: {
    toolsConsidered: number;
    toolsInjected: number;
    tokensEstimated: number;
    toolsDenied: number;
  };
  autoPruneSuggestions: string[];
  governedExceptions: string[];
}

export interface ToolSelectionInputs {
  planStepId: string;
  planStepSummary: string;
  expectedUtility: string;
  alternativesConsidered: string[];
}

export interface PolicyBreakGlass {
  tool: string;
  reason: string;
  expiresAt: string;
  approvedBy: string;
}

export interface PolicyConfig {
  allow?: string[];
  deny?: string[];
  environments?: Record<string, { allow?: string[]; deny?: string[] }>;
  breakGlass?: PolicyBreakGlass[];
}
